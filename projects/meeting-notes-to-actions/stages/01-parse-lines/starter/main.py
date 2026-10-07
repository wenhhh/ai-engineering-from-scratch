"""在自己的工作区补全各阶段接口；保留函数名及未实现错误。"""


def parse_notes(text):
    raise NotImplementedError("parse_notes")


def validate_action(action):
    raise NotImplementedError("validate_action")


def deduplicate(actions):
    raise NotImplementedError("deduplicate")


def publish(actions, today):
    raise NotImplementedError("publish")
