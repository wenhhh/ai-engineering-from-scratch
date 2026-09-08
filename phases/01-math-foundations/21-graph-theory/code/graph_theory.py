import numpy as np
from collections import deque


class Graph:
    def __init__(self, n_nodes, directed=False):
        self.n = n_nodes
        self.directed = directed
        self.adj = {i: {} for i in range(n_nodes)}

    def add_edge(self, u, v, weight=1.0):
        self.adj[u][v] = weight
        if not self.directed:
            self.adj[v][u] = weight

    def neighbors(self, node):
        return list(self.adj[node].keys())

    def degree(self, node):
        return len(self.adj[node])

    def weighted_degree(self, node):
        return sum(self.adj[node].values())

    def adjacency_matrix(self):
        A = np.zeros((self.n, self.n))
        for u in range(self.n):
            for v, w in self.adj[u].items():
                A[u][v] = w
        return A

    def degree_matrix(self):
        D = np.zeros((self.n, self.n))
        for i in range(self.n):
            D[i][i] = self.weighted_degree(i)
        return D

    def laplacian(self):
        return self.degree_matrix() - self.adjacency_matrix()

    def __repr__(self):
        edges = []
        seen = set()
        for u in range(self.n):
            for v, w in self.adj[u].items():
                key = (min(u, v), max(u, v)) if not self.directed else (u, v)
                if key not in seen:
                    seen.add(key)
                    if w == 1.0:
                        edges.append(f"{u}-{v}")
                    else:
                        edges.append(f"{u}-{v}({w})")
        return f"Graph(n={self.n}, edges=[{', '.join(edges)}])"


def bfs(graph, start):
    visited = set()
    order = []
    distances = {}
    queue = deque([(start, 0)])
    visited.add(start)
    while queue:
        node, dist = queue.popleft()
        order.append(node)
        distances[node] = dist
        for neighbor in graph.neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return order, distances


def dfs(graph, start):
    visited = set()
    order = []
    stack = [start]
    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        for neighbor in reversed(graph.neighbors(node)):
            if neighbor not in visited:
                stack.append(neighbor)
    return order


def connected_components(graph):
    visited = set()
    components = []
    for node in range(graph.n):
        if node not in visited:
            order, _ = bfs(graph, node)
            visited.update(order)
            components.append(order)
    return components


def spectral_clustering(graph, k=2):
    if graph.n < 2:
        raise ValueError("spectral_clustering 至少需要 2 个节点（Nodes）")
    if not (2 <= k <= graph.n):
        raise ValueError(f"k 必须满足 2 <= k <= {graph.n}，实际为 k={k}")

    L = graph.laplacian()
    eigenvalues, eigenvectors = np.linalg.eigh(L)

    if k == 2:
        fiedler = eigenvectors[:, 1]
        labels = np.zeros(graph.n, dtype=int)
        labels[fiedler < 0] = 1
        return labels

    features = eigenvectors[:, 1:k + 1]
    norms = np.linalg.norm(features, axis=1, keepdims=True)
    norms[norms == 0] = 1
    features = features / norms

    rng = np.random.RandomState(42)
    centroids = features[rng.choice(graph.n, k, replace=False)]

    for _ in range(100):
        dists = np.zeros((graph.n, k))
        for c in range(k):
            dists[:, c] = np.linalg.norm(features - centroids[c], axis=1)
        labels = np.argmin(dists, axis=1)

        new_centroids = np.zeros_like(centroids)
        for c in range(k):
            mask = labels == c
            if mask.any():
                new_centroids[c] = features[mask].mean(axis=0)

        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids

    return labels


def message_passing(graph, features, weight_matrix):
    A = graph.adjacency_matrix()
    row_sums = A.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    A_norm = A / row_sums

    aggregated = A_norm @ features
    output = aggregated @ weight_matrix
    return output


def pagerank(graph, damping=0.85, max_iter=100, tol=1e-6):
    n = graph.n
    scores = np.ones(n) / n

    for _ in range(max_iter):
        new_scores = np.ones(n) * (1 - damping) / n
        dangling_sum = 0.0
        for u in range(n):
            out_deg = graph.degree(u)
            if out_deg > 0:
                for v in graph.neighbors(u):
                    new_scores[v] += damping * scores[u] / out_deg
            else:
                dangling_sum += scores[u]
        new_scores += damping * dangling_sum / n
        if np.abs(new_scores - scores).sum() < tol:
            scores = new_scores
            break
        scores = new_scores

    return scores


def demo_social_network():
    print("=" * 60)
    print("演示 1：小型社交网络，广度优先搜索（BFS）与深度优先搜索（DFS）")
    print("=" * 60)

    g = Graph(6)
    g.add_edge(0, 1)
    g.add_edge(0, 2)
    g.add_edge(1, 3)
    g.add_edge(2, 3)
    g.add_edge(3, 4)
    g.add_edge(4, 5)

    print(f"\n图（Graph）： {g}")
    print(f"\n邻接矩阵（Adjacency matrix）：\n{g.adjacency_matrix().astype(int)}")

    for node in range(g.n):
        print(f"  节点（Node）{node}： degree={g.degree(node)}, neighbors={g.neighbors(node)}")

    bfs_order, bfs_dist = bfs(g, 0)
    print(f"\n从节点 0 开始广度优先搜索（BFS）：")
    print(f"  访问顺序（Visit order）： {bfs_order}")
    print(f"  距离（Distances）：   {bfs_dist}")

    dfs_order = dfs(g, 0)
    print(f"\n从节点 0 开始深度优先搜索（DFS）：")
    print(f"  访问顺序（Visit order）： {dfs_order}")


def demo_laplacian():
    print("\n" + "=" * 60)
    print("演示 2：拉普拉斯特征值（Laplacian Eigenvalues）与连通分量（Connected Components）")
    print("=" * 60)

    g = Graph(7)
    g.add_edge(0, 1)
    g.add_edge(1, 2)
    g.add_edge(0, 2)
    g.add_edge(3, 4)
    g.add_edge(5, 6)

    print(f"\n图（Graph）： {g}")
    print(f"连通分量（Connected components）： {connected_components(g)}")

    L = g.laplacian()
    eigenvalues = np.linalg.eigvalsh(L)
    print(f"\n拉普拉斯矩阵（Laplacian）：\n{L.astype(int)}")
    print(f"\n特征值（Eigenvalues）： {np.round(eigenvalues, 4)}")

    n_zeros = np.sum(np.abs(eigenvalues) < 1e-8)
    print(f"零特征值的数量： {n_zeros}")
    print(f"连通分量的数量： {len(connected_components(g))}")
    print(f"一致： {n_zeros == len(connected_components(g))}")


def demo_message_passing():
    print("\n" + "=" * 60)
    print("演示 3：具有随机节点特征的消息传递（Message Passing）")
    print("=" * 60)

    g = Graph(5)
    g.add_edge(0, 1)
    g.add_edge(0, 2)
    g.add_edge(1, 2)
    g.add_edge(2, 3)
    g.add_edge(3, 4)

    rng = np.random.RandomState(42)
    features = rng.randn(5, 3)
    W = rng.randn(3, 2) * 0.5

    print(f"\n图（Graph）： {g}")
    print(f"\n节点特征（Node features）：5 个节点，每个节点 3 个特征：")
    for i in range(5):
        print(f"  节点（Node）{i}： {np.round(features[i], 4)}")

    output = message_passing(g, features, W)
    print(f"\n进行 1 轮消息传递后（输出维度 = 2）：")
    for i in range(5):
        print(f"  节点（Node）{i}： {np.round(output[i], 4)}")

    output2 = message_passing(g, output, rng.randn(2, 2) * 0.5)
    print(f"\n进行 2 轮后（包含二跳邻域信息，2-hop neighborhood）：")
    for i in range(5):
        print(f"  节点（Node）{i}： {np.round(output2[i], 4)}")


def demo_spectral_clustering():
    print("\n" + "=" * 60)
    print("演示 4：对两个社群进行谱聚类（Spectral Clustering）")
    print("=" * 60)

    g = Graph(10)
    for i in range(5):
        for j in range(i + 1, 5):
            g.add_edge(i, j)
    for i in range(5, 10):
        for j in range(i + 1, 10):
            g.add_edge(i, j)
    g.add_edge(2, 7)

    print(f"\n图（Graph）：两个团（Cliques，0-4 和 5-9）由边 2-7 连接")

    labels = spectral_clustering(g, k=2)
    print(f"\n谱聚类标签（Spectral clustering labels）： {labels}")
    print(f"簇（Cluster）0： {np.where(labels == 0)[0]}")
    print(f"簇（Cluster）1： {np.where(labels == 1)[0]}")

    L = g.laplacian()
    eigenvalues = np.linalg.eigvalsh(L)
    print(f"\n拉普拉斯特征值（Laplacian eigenvalues）： {np.round(eigenvalues, 4)}")
    print(f"菲德勒值（Fiedler value，代数连通度）： {eigenvalues[1]:.4f}")

    scores = pagerank(g)
    print(f"\nPageRank 得分：")
    for i in range(g.n):
        print(f"  节点（Node）{i}： {scores[i]:.4f}")

    bridge_nodes = [2, 7]
    non_bridge = [n for n in range(g.n) if n not in bridge_nodes]
    print(f"\n桥接节点（Bridge nodes）{bridge_nodes} 的 PageRank： "
          f"{np.mean(scores[bridge_nodes]):.4f}")
    print(f"非桥接节点的平均 PageRank： "
          f"{np.mean(scores[non_bridge]):.4f}")
    print("桥接节点的 PageRank 更高，因为它们连接不同社群。")


if __name__ == "__main__":
    demo_social_network()
    demo_laplacian()
    demo_message_passing()
    demo_spectral_clustering()
