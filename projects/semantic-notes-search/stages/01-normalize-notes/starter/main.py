"""在自己的工作区中补全各阶段接口。"""


def normalize(text, aliases=None):
    raise NotImplementedError("normalize")


def build_index(documents, aliases=None):
    raise NotImplementedError("build_index")


def search(index, query, k=3):
    raise NotImplementedError("search")


def evaluate(index, cases, k=3):
    raise NotImplementedError("evaluate")
