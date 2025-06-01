const defaultCode = `

import runloop, hub, json, math, random

class Eventer:
    def __init__(self):
        self.__subscribers = {}
        self.__queue = []

    def subscribe(self, event_name, callback):
        if event_name not in self.__subscribers:
            self.__subscribers[event_name] = []
        self.__subscribers[event_name].append(callback)

    def emit(self, event_name):
        # Instead of recursive calls, just queue the event
        self.__queue.append(event_name)

    async def process(self):
        while self.__queue:
            event_name = self.__queue.pop(0)
            runloop.run(*[callback() for callback in self.__subscribers[event_name]])

    def is_queue_non_empty(self):
        return bool(self.__queue)

eventer = Eventer()

class Messenger():
    def __init__(self, tunnel):
        self.__tunnel = tunnel
        self.__queue = []
        self.__is_sending = False
        self.__buffer = []

        self.__BANDWIDTH = 8192 // 16
        self.__MAX_PACKET_SIZE = 509 # assume it's always default
        # [max message size] = [max packet size] - [number of bytes for storing message code, length, frameId, totalFrames]
        self.__MAX_MESSAGE_SIZE = self.__MAX_PACKET_SIZE - 5 # 1 for ID, 2 for length, 1 for frameId, 1 for frameTotal


    def __queue_message(self, message):
        # encoding the message
        encoded_full_message = message.encode('utf-8')

        chunks = [
            encoded_full_message[i:i + self.__MAX_MESSAGE_SIZE]
            for i in range(0, len(encoded_full_message), self.__MAX_MESSAGE_SIZE)
        ]

        total_frames = len(chunks)

        frames = [
            bytes([frame_id, total_frames]) + chunk
            for frame_id, chunk in enumerate(chunks)
        ]

        self.__queue.extend(frames)

    def send_object(self, obj):
        stringified_object = json.dumps(obj)
        self.__queue_message(stringified_object)
        eventer.emit("process_message_queue")

    def init_message_listener(self, message_handler):
        def process_chunk(data):
            data_bytes = bytes(data)
            if len(data_bytes) < 2:
                return

            frame_id = data_bytes[0]
            total_frames = data_bytes[1]
            chunk = data_bytes[2:]

            self.__buffer.append(chunk)

            if len(self.__buffer) == total_frames:
                full_message = b"".join(self.__buffer)
                self.__buffer = []
                
                try:
                    decoded_message = full_message.decode('utf-8')
                    message_handler(json.loads(decoded_message))
                except Exception as e:
                    print("error received ", e)

        self.__tunnel.callback(process_chunk)
        
    def announce_start(self):
        self.send_object({"action": "program_start", "payload": {}})


    async def process_queue(self):
        if self.__is_sending:
            return

        if not self.__queue:
            return

        self.__is_sending = True

        if self.__queue:
            data = self.__queue.pop(0)
            size = len(data) + 3

            # Calculate wait time based on the message size
            wait_ms = size * 1_000 // self.__BANDWIDTH

            self.__tunnel.send(data)
            await runloop.sleep_ms(wait_ms)

        self.__is_sending = False
        eventer.emit("process_message_queue")

tunnel = hub.config["module_tunnel"]
messenger = Messenger(tunnel)

eventer.subscribe("process_message_queue", messenger.process_queue)


class EventListener:
    def __init__(self, condition_func, callback):
        self.__condition_func = condition_func
        self.__callback = callback
        self.__last_condition = False# Track previous condition

    async def listen(self):
        while True:
            current_condition = self.__condition_func()

            # Trigger callback only when condition starts returning True
            if current_condition and not self.__last_condition:
                await self.__callback()

            self.__last_condition = current_condition
            await runloop.sleep_ms(50)

from hub import light_matrix, port

HAPPY_EMOTION = [100, 100, 0, 100, 100, 100, 100, 0, 100, 100, 0, 0, 0, 0, 0, 100, 0, 0, 0, 100, 0, 100, 100, 100, 0]

async def show_happy():
    light_matrix.show(HAPPY_EMOTION)
    await runloop.sleep_ms(1000)
    light_matrix.clear()


eventer.subscribe("show_happy_event_name", show_happy) # with help of this example you can call events and assign handlers to it


async def right_button_click_handler():
    messenger.send_object({"action": "clicked", "payload": {} })

def is_right_button_clicked():
    return bool(hub.button.pressed(hub.button.RIGHT))

right_button_click_listener = EventListener(is_right_button_clicked, right_button_click_handler)

events_listener = EventListener(eventer.is_queue_non_empty, eventer.process)


def handle_tunnel_message(message):
    if "action" not in message:
        return

    action = message["action"]

    if action == "show_smile":
        eventer.emit("show_happy_event_name") # in this function you can't call any async functions. Therefore, I advise to emit an event and assign a handler to the event as shown above. If the code is sync, it's fine, just put it here

    else:
        return


messenger.init_message_listener(handle_tunnel_message)
messenger.announce_start()

runloop.run(events_listener.listen(), right_button_click_listener.listen())
`;

export default defaultCode;