import random
import math


def sigmoid(z):
    z = max(-500, min(500, z))
    return 1.0 / (1.0 + math.exp(-z))


random.seed(42)
N = 200
X = []
y = []

for _ in range(N // 2):
    X.append([random.gauss(2, 1), random.gauss(2, 1)])
    y.append(0)

for _ in range(N // 2):
    X.append([random.gauss(5, 1), random.gauss(5, 1)])
    y.append(1)

combined = list(zip(X, y))
random.shuffle(combined)
X, y = zip(*combined)
X = list(X)
y = list(y)

print(f"生成了 {N} 个样本（2 个类别，2 个特征）")
print(f"类别 0 的中心：(2, 2)，类别 1 的中心：(5, 5)")
print(f"前 5 个样本：")
for i in range(5):
    print(f"  特征（Features）： [{X[i][0]:.2f}, {X[i][1]:.2f}], 标签（Label）： {y[i]}")


class LogisticRegression:
    def __init__(self, n_features, learning_rate=0.01):
        self.weights = [0.0] * n_features
        self.bias = 0.0
        self.lr = learning_rate
        self.loss_history = []

    def predict_proba(self, x):
        z = sum(w * xi for w, xi in zip(self.weights, x)) + self.bias
        return sigmoid(z)

    def predict(self, x, threshold=0.5):
        return 1 if self.predict_proba(x) >= threshold else 0

    def compute_loss(self, X, y):
        n = len(y)
        total = 0.0
        for i in range(n):
            p = self.predict_proba(X[i])
            p = max(1e-15, min(1 - 1e-15, p))
            total += y[i] * math.log(p) + (1 - y[i]) * math.log(1 - p)
        return -total / n

    def fit(self, X, y, epochs=1000, print_every=200):
        n = len(y)
        n_features = len(X[0])
        for epoch in range(epochs):
            dw = [0.0] * n_features
            db = 0.0
            for i in range(n):
                p = self.predict_proba(X[i])
                error = p - y[i]
                for j in range(n_features):
                    dw[j] += error * X[i][j]
                db += error
            for j in range(n_features):
                self.weights[j] -= self.lr * (dw[j] / n)
            self.bias -= self.lr * (db / n)
            loss = self.compute_loss(X, y)
            self.loss_history.append(loss)
            if epoch % print_every == 0:
                print(f"  轮次（Epoch）{epoch:4d} | 损失（Loss）： {loss:.4f} | w: [{self.weights[0]:.3f}, {self.weights[1]:.3f}] | b: {self.bias:.3f}")
        return self

    def accuracy(self, X, y):
        correct = sum(1 for i in range(len(y)) if self.predict(X[i]) == y[i])
        return correct / len(y)


split = int(0.8 * N)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

print("\n=== 训练逻辑回归（Logistic Regression） ===")
model = LogisticRegression(n_features=2, learning_rate=0.1)
model.fit(X_train, y_train, epochs=1000, print_every=200)

print(f"\n训练准确率（Train Accuracy）： {model.accuracy(X_train, y_train):.4f}")
print(f"测试准确率（Test Accuracy）：  {model.accuracy(X_test, y_test):.4f}")
print(f"权重（Weights）： [{model.weights[0]:.4f}, {model.weights[1]:.4f}]")
print(f"偏置（Bias）： {model.bias:.4f}")


class ClassificationMetrics:
    def __init__(self, y_true, y_pred):
        self.tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
        self.tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
        self.fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
        self.fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)

    def accuracy(self):
        total = self.tp + self.tn + self.fp + self.fn
        return (self.tp + self.tn) / total if total > 0 else 0

    def precision(self):
        denom = self.tp + self.fp
        return self.tp / denom if denom > 0 else 0

    def recall(self):
        denom = self.tp + self.fn
        return self.tp / denom if denom > 0 else 0

    def f1(self):
        p = self.precision()
        r = self.recall()
        return 2 * p * r / (p + r) if (p + r) > 0 else 0

    def print_confusion_matrix(self):
        print(f"\n  混淆矩阵（Confusion Matrix）:")
        print(f"                  预测值（Predicted）")
        print(f"                  正类（Pos）   负类（Neg）")
        print(f"  实际正类（Actual Pos）     {self.tp:4d}  {self.fn:4d}")
        print(f"  实际负类（Actual Neg）     {self.fp:4d}  {self.tn:4d}")

    def print_report(self):
        self.print_confusion_matrix()
        print(f"\n  准确率（Accuracy）：  {self.accuracy():.4f}")
        print(f"  精确率（Precision）： {self.precision():.4f}")
        print(f"  召回率（Recall）：    {self.recall():.4f}")
        print(f"  F1 分数（F1 Score）：  {self.f1():.4f}")


y_pred_test = [model.predict(x) for x in X_test]
print("\n=== 分类报告（Classification Report，测试集） ===")
metrics = ClassificationMetrics(y_test, y_pred_test)
metrics.print_report()


print("\n=== 决策边界（Decision Boundary） ===")
w1, w2 = model.weights
b = model.bias
print(f"决策边界（Decision Boundary）： {w1:.4f}*x1 + {w2:.4f}*x2 + {b:.4f} = 0")
if abs(w2) > 1e-10:
    print(f"解出 x2：     x2 = {-w1/w2:.4f}*x1 + {-b/w2:.4f}")

print("\n边界附近样本的预测结果：")
test_points = [
    [3.0, 3.0],
    [3.5, 3.5],
    [4.0, 4.0],
    [2.5, 2.5],
    [5.0, 5.0],
]
for point in test_points:
    prob = model.predict_proba(point)
    pred = model.predict(point)
    print(f"  [{point[0]}, {point[1]}] -> 概率（prob）={prob:.4f}, 类别（class）={pred}")


class SoftmaxRegression:
    def __init__(self, n_features, n_classes, learning_rate=0.01):
        self.n_features = n_features
        self.n_classes = n_classes
        self.lr = learning_rate
        self.weights = [[0.0] * n_features for _ in range(n_classes)]
        self.biases = [0.0] * n_classes

    def softmax(self, scores):
        max_score = max(scores)
        exp_scores = [math.exp(s - max_score) for s in scores]
        total = sum(exp_scores)
        return [e / total for e in exp_scores]

    def predict_proba(self, x):
        scores = [
            sum(self.weights[k][j] * x[j] for j in range(self.n_features)) + self.biases[k]
            for k in range(self.n_classes)
        ]
        return self.softmax(scores)

    def predict(self, x):
        probs = self.predict_proba(x)
        return probs.index(max(probs))

    def fit(self, X, y, epochs=1000, print_every=200):
        n = len(y)
        for epoch in range(epochs):
            grad_w = [[0.0] * self.n_features for _ in range(self.n_classes)]
            grad_b = [0.0] * self.n_classes
            total_loss = 0.0
            for i in range(n):
                probs = self.predict_proba(X[i])
                for k in range(self.n_classes):
                    target = 1.0 if y[i] == k else 0.0
                    error = probs[k] - target
                    for j in range(self.n_features):
                        grad_w[k][j] += error * X[i][j]
                    grad_b[k] += error
                true_prob = max(probs[y[i]], 1e-15)
                total_loss -= math.log(true_prob)
            for k in range(self.n_classes):
                for j in range(self.n_features):
                    self.weights[k][j] -= self.lr * (grad_w[k][j] / n)
                self.biases[k] -= self.lr * (grad_b[k] / n)
            if epoch % print_every == 0:
                print(f"  轮次（Epoch）{epoch:4d} | 损失（Loss）： {total_loss / n:.4f}")
        return self

    def accuracy(self, X, y):
        correct = sum(1 for i in range(len(y)) if self.predict(X[i]) == y[i])
        return correct / len(y)


random.seed(42)
X_3class = []
y_3class = []

centers = [(1, 1), (5, 1), (3, 5)]
for label, (cx, cy) in enumerate(centers):
    for _ in range(50):
        X_3class.append([random.gauss(cx, 0.8), random.gauss(cy, 0.8)])
        y_3class.append(label)

combined = list(zip(X_3class, y_3class))
random.shuffle(combined)
X_3class, y_3class = zip(*combined)
X_3class = list(X_3class)
y_3class = list(y_3class)

split_3 = int(0.8 * len(X_3class))
X_train_3 = X_3class[:split_3]
y_train_3 = y_3class[:split_3]
X_test_3 = X_3class[split_3:]
y_test_3 = y_3class[split_3:]

print("\n=== 多分类 Softmax 回归（Softmax Regression，3 个类别） ===")
softmax_model = SoftmaxRegression(n_features=2, n_classes=3, learning_rate=0.1)
softmax_model.fit(X_train_3, y_train_3, epochs=1000, print_every=200)
print(f"\n训练准确率（Train Accuracy）： {softmax_model.accuracy(X_train_3, y_train_3):.4f}")
print(f"测试准确率（Test Accuracy）：  {softmax_model.accuracy(X_test_3, y_test_3):.4f}")

print("\n样本预测结果：")
for i in range(5):
    probs = softmax_model.predict_proba(X_test_3[i])
    pred = softmax_model.predict(X_test_3[i])
    print(f"  真实值： {y_test_3[i]}, 预测值： {pred}, 概率（Probs）： [{', '.join(f'{p:.3f}' for p in probs)}]")


print("\n=== 阈值调优（Threshold Tuning） ===")
print("默认阈值为 0.5。调整阈值可以权衡精确率（Precision）与召回率（Recall）。\n")

thresholds = [0.3, 0.4, 0.5, 0.6, 0.7]
print(f"{'阈值（Threshold）':>10} {'准确率（Accuracy）':>10} {'精确率（Precision）':>10} {'召回率（Recall）':>10} {'F1':>10}")
print("-" * 52)

for t in thresholds:
    y_pred_t = [1 if model.predict_proba(x) >= t else 0 for x in X_test]
    m = ClassificationMetrics(y_test, y_pred_t)
    print(f"{t:>10.1f} {m.accuracy():>10.4f} {m.precision():>10.4f} {m.recall():>10.4f} {m.f1():>10.4f}")


print("\n=== 线性回归（Linear Regression）为何不适合分类 ===")
print("对二元标签（Binary Labels）拟合线性回归：")
x_hours = list(range(1, 11))
y_pass = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]

n = len(x_hours)
x_mean = sum(x_hours) / n
y_mean = sum(y_pass) / n
numerator = sum((x_hours[i] - x_mean) * (y_pass[i] - y_mean) for i in range(n))
denominator = sum((x_hours[i] - x_mean) ** 2 for i in range(n))
w_lin = numerator / denominator
b_lin = y_mean - w_lin * x_mean

print(f"\n线性拟合（Linear Fit）： y = {w_lin:.4f}*x + {b_lin:.4f}")
print(f"{'小时（Hours）':>6} {'实际值（Actual）':>8} {'线性（Linear）':>8} {'Sigmoid':>8}")
for h, actual in zip(x_hours, y_pass):
    lin_pred = w_lin * h + b_lin
    sig_pred = sigmoid(3 * (h - 4.5))
    print(f"{h:>6d} {actual:>8d} {lin_pred:>8.3f} {sig_pred:>8.3f}")

print("\n线性回归的输出会超出 [0, 1]。")
print("逻辑回归将所有输出限制在 [0, 1] 内，作为概率。")


print("\n=== Scikit-learn 对比 ===")
try:
    from sklearn.linear_model import LogisticRegression as SklearnLR
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    from sklearn.metrics import confusion_matrix, classification_report
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    import numpy as np

    np.random.seed(42)
    X_0 = np.random.randn(100, 2) + [2, 2]
    X_1 = np.random.randn(100, 2) + [5, 5]
    X_sk = np.vstack([X_0, X_1])
    y_sk = np.array([0] * 100 + [1] * 100)

    X_tr, X_te, y_tr, y_te = train_test_split(X_sk, y_sk, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_tr_sc = scaler.fit_transform(X_tr)
    X_te_sc = scaler.transform(X_te)

    lr = SklearnLR()
    lr.fit(X_tr_sc, y_tr)
    y_pred_sk = lr.predict(X_te_sc)

    print(f"准确率（Accuracy）：  {accuracy_score(y_te, y_pred_sk):.4f}")
    print(f"精确率（Precision）： {precision_score(y_te, y_pred_sk):.4f}")
    print(f"召回率（Recall）：    {recall_score(y_te, y_pred_sk):.4f}")
    print(f"F1:        {f1_score(y_te, y_pred_sk):.4f}")
    print(f"\n混淆矩阵（Confusion Matrix）:\n{confusion_matrix(y_te, y_pred_sk)}")
    print(f"\n分类报告（Classification Report）：\n{classification_report(y_te, y_pred_sk)}")

except ImportError:
    print("未安装 scikit-learn。安装命令：pip install scikit-learn")
    print("上述从零实现的版本无需任何依赖即可运行。")
