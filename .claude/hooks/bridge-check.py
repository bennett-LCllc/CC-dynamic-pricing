#!/usr/bin/env python3
"""Claude Code bridge check hook for corpus-christi-ops.
Reads tasks from the Hermes bridge and injects them into Claude's context.
Runs on UserPromptSubmit and Stop events.
"""
import json
import sys
from pathlib import Path
from datetime import datetime

BRIDGE = Path.home() / ".hermes" / "claude-bridge"
CHANNEL = BRIDGE / "channel.jsonl"
ACTIVE = BRIDGE / "active"
LAST_READ = BRIDGE / ".last_read"


def get_last_read_ts():
    if LAST_READ.exists():
        return LAST_READ.read_text().strip()
    return ""


def update_last_read(ts):
    LAST_READ.write_text(ts)


def check_channel():
    messages = []
    last_ts = get_last_read_ts()
    if not CHANNEL.exists():
        return messages
    for line in CHANNEL.read_text().strip().splitlines():
        if not line.strip():
            continue
        try:
            msg = json.loads(line)
            if msg.get("from") == "evey" and msg.get("timestamp", "") > last_ts:
                messages.append(f"[{msg['timestamp'][:16]}] {msg.get('message', '')[:400]}")
        except (json.JSONDecodeError, KeyError):
            pass
    return messages


def check_active_tasks():
    tasks = []
    if not ACTIVE.exists():
        return tasks
    for f in sorted(ACTIVE.glob("*.yaml")):
        try:
            import yaml
            data = yaml.safe_load(f.read_text())
            if data and data.get("type") in ("code-change", "research", "patch", "review", "new-file"):
                tasks.append(f"[TASK {f.ste}] {data.get('description', '')[:400]}")
        except Exception:
            pass
    return tasks


def main():
    event = sys.argv[1] if len(sys.argv) > 1 else "UserPromptSubmit"

    channel_msgs = check_channel()
    active_tasks = check_active_tasks()
    all_items = channel_msgs + active_tasks

    if all_items:
        # Update last read timestamp
        if CHANNEL.exists():
            for line in reversed(CHANNEL.read_text().strip().splitlines()):
                try:
                    msg = json.loads(line)
                    if msg.get("from") == "evey":
                        update_last_read(msg.get("timestamp", ""))
                        break
                except (json.JSONDecodeError, KeyError):
                    pass

        context = "BRIDGE MESSAGE FROM EVEY/OWL:\n" + "\n".join(all_items[-10:])

        if event == "Stop":
            output = {
                "systemMessage": f"Bridge has {len(all_items)} pending item(s):\n{context[:500]}"
            }
        else:
            output = {
                "hookSpecificOutput": {
                    "hookEventName": event,
                    "additionalContext": context,
                }
            }
        print(json.dumps(output))
    else:
        print(json.dumps({"suppressOutput": True}))


if __name__ == "__main__":
    main()
