"""在自己的工作区中完成各阶段接口；起始实现预期测试失败。"""


def nonnegative(value):
    raise NotImplementedError("nonnegative")


def estimate(input_tokens, output_limit, input_rate, output_rate):
    raise NotImplementedError("estimate")


def ledger(limit):
    raise NotImplementedError("ledger")


def reserve(state, request_id, amount):
    raise NotImplementedError("reserve")


def settle(state, request_id, actual):
    raise NotImplementedError("settle")


def schedule(jobs, limit, deadline_ms):
    raise NotImplementedError("schedule")
