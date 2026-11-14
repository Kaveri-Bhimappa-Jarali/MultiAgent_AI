import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

interface WebSocketContextType {
  status: ConnectionState;
  lastEventTime: string | null;
  lastProcessedTime: string | null;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  reconnect: () => void;
}

const WebSocketSubscriptionContext = createContext<WebSocketContextType['subscribe'] | null>(null);

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionState>('CONNECTING');
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);
  const [lastProcessedTime, setLastProcessedTime] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(1000); // Exponential backoff starts at 1s
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(callback);

    // Return cleanup unsubscribe function
    return () => {
      subscribersRef.current.get(eventType)?.delete(callback);
    };
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('CONNECTING');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If on dev server (port 3000), point to backend at 8000
    const host = window.location.port === '3000' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        setStatus('CONNECTED');
        backoffRef.current = 1000; // Reset backoff on success

        // Start heartbeat ping every 15s
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;

        try {
          const payload = JSON.parse(event.data);
          const { type, data, timestamp } = payload;

          if (timestamp) {
            if (type === 'EVENT_INGESTED') {
              setLastEventTime(data?.timestamp || timestamp);
            } else if (type === 'EVENT_PROCESSED') {
              setLastProcessedTime(data?.processed_at || timestamp);
            }
          }

          // Dispatch to event subscribers
          const callbacks = subscribersRef.current.get(type);
          if (callbacks) {
            callbacks.forEach((cb) => {
              try {
                cb(data);
              } catch (err) {
                console.error(`Error in WebSocket subscriber for ${type}:`, err);
              }
            });
          }

          // Wildcard subscribers
          const wildcardCallbacks = subscribersRef.current.get('*');
          if (wildcardCallbacks) {
            wildcardCallbacks.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {}
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        if (socketRef.current === ws) socketRef.current = null;
        setStatus('DISCONNECTED');
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        // Exponential backoff reconnect up to 10s
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        if (isMountedRef.current) ws.close();
      };
    } catch (err) {
      setStatus('DISCONNECTED');
      reconnectTimeoutRef.current = window.setTimeout(connect, backoffRef.current);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialConnectTimeout = window.setTimeout(connect, 0);
    return () => {
      isMountedRef.current = false;
      clearTimeout(initialConnectTimeout);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider
      value={{
        status,
        lastEventTime,
        lastProcessedTime,
        subscribe,
        reconnect
      }}
    >
      <WebSocketSubscriptionContext.Provider value={subscribe}>
        {children}
      </WebSocketSubscriptionContext.Provider>
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};


// Consumers that only subscribe do not need to rerender on every socket timestamp.
export const useWebSocketSubscription = () => {
  const subscribe = useContext(WebSocketSubscriptionContext);
  if (!subscribe) throw new Error('useWebSocketSubscription requires WebSocketProvider');
  return subscribe;
};
