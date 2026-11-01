import importlib.util
import io
from pathlib import Path
import subprocess


RUNNER_PATH = (
    Path(__file__).resolve().parents[1] / "run_local_virtual_nodes.py"
)
spec = importlib.util.spec_from_file_location("run_local_virtual_nodes", RUNNER_PATH)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class FakeProcess:
    def __init__(self):
        self.stdout = io.StringIO()
        self.returncode = None
        self.terminated = False

    def poll(self):
        return self.returncode

    def terminate(self):
        self.terminated = True
        self.returncode = -15

    def wait(self, timeout=None):
        return self.returncode

    def kill(self):
        self.returncode = -9


def test_read_guest_output_reads_stdout_and_detects_real_ack(capsys):
    process = FakeProcess()
    process.stdout = io.StringIO(
        "collector starting\n"
        "[vm-test] Heartbeat acknowledged by SOC Host.\n"
    )
    heartbeat_ack = runner.threading.Event()

    runner.read_guest_output("vm-test", process, heartbeat_ack)

    assert heartbeat_ack.is_set()
    assert "[vm-test] collector starting" in capsys.readouterr().out


def test_start_guest_node_captures_text_output_and_merges_stderr(monkeypatch):
    expected_process = FakeProcess()
    received = {}

    def fake_popen(command, **kwargs):
        received["command"] = command
        received["kwargs"] = kwargs
        return expected_process

    monkeypatch.setattr(runner.subprocess, "Popen", fake_popen)
    node = {"vm_id": "vm-test", "api_key": "test-key"}

    process = runner.start_guest_node("http://127.0.0.1:8000", node, "events.log")

    assert process is expected_process
    assert received["kwargs"]["stdout"] == subprocess.PIPE
    assert received["kwargs"]["stderr"] == subprocess.STDOUT
    assert received["kwargs"]["text"] is True
    assert received["command"][1] == "-u"
    assert received["command"][3] == "http://127.0.0.1:8000"


def test_runner_stops_started_process_when_later_start_fails(
    monkeypatch, tmp_path, capsys
):
    process = FakeProcess()
    calls = 0

    def fake_popen(command, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("simulated process startup failure")
        return process

    monkeypatch.setattr(runner.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(runner, "__file__", str(tmp_path / "run_local_virtual_nodes.py"))

    exit_code = runner.main(["http://127.0.0.1:8000"])
    output = capsys.readouterr()

    assert exit_code == 1
    assert process.terminated
    assert "simulated process startup failure" in output.err
    assert "All three local guest-agent processes are running" not in output.out


def test_soc_url_uses_environment_default_and_cli_override():
    assert runner.resolve_soc_url([], {}) == "http://127.0.0.1:8000"
    assert runner.resolve_soc_url(
        [], {"SOC_HOST_URL": "http://soc.example:8000/"}
    ) == "http://soc.example:8000"
    assert runner.resolve_soc_url(
        ["http://cli.example:8001"], {"SOC_HOST_URL": "http://env.example:8000"}
    ) == "http://cli.example:8001"
