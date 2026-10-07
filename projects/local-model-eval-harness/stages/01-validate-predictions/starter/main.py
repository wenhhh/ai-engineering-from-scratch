"""在自己的工作区补全各阶段接口；保留函数名及未实现错误。"""


def validate(records):
    raise NotImplementedError("validate")


def correct(record, labels):
    raise NotImplementedError("correct")


def accuracy(records, labels):
    raise NotImplementedError("accuracy")


def calibration(records, labels, bins=5):
    raise NotImplementedError("calibration")


def percentile(values, p):
    raise NotImplementedError("percentile")


def scorecard(records, labels, source):
    raise NotImplementedError("scorecard")
