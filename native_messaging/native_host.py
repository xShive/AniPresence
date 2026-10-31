# ========== Imports ==========
import sys
import struct
import json
import os, msvcrt

# ========== Funcs ==========
def receive_message():
    # first 4 bytes = JSON string length in bytes
    text_length_bytes = sys.stdin.buffer.read(4)
    if not text_length_bytes:
        sys.exit()

    text_length = struct.unpack("@I", text_length_bytes)[0]
    message = sys.stdin.buffer.read(text_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    # convert msg to JSON string // then that into bytes
    message_bytes = json.dumps(message).encode("utf-8")

    # first 4 bytes = length
    length_bytes = struct.pack("@I", len(message_bytes))

    sys.stdout.buffer.write(length_bytes)
    sys.stdout.buffer.write(message_bytes)
    sys.stdout.buffer.flush()


# ========== Main ==========
if __name__ == '__main__':
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    
    received = receive_message()
    if received.get("action") == "get_token":
        token_path = os.path.join(os.environ["APPDATA"], "AniPresence", "local_api_token.txt")
        try:
            with open(token_path, "r", encoding="utf-8") as f:
                token = json.load(f)
        except FileNotFoundError:
            send_message({"error": "AniPresence's authentication file is missing; start the app first."})
        except json.JSONDecodeError:
            send_message({"error": "AniPresence's authentication file contains invalid JSON."})
        else:
            if not isinstance(token, str) or not token:
                send_message({"error": "AniPresence's authentication file does not contain a valid token."})
            else:
                send_message({"token": token})
    else:
        send_message({"error": "Unknown action prompted for the native host."})
