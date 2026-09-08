# 终端与命令解释器（Terminal & Shell）

> 终端是 AI 工程师日常工作的地方。先熟悉这里。

**Type:** Learn
**Languages:** --
**Prerequisites:** 阶段 0，第 01 课
**Time:** ~35 分钟

## 学习目标（Learning Objectives）

- 在命令行中使用管道（Pipe）、重定向（Redirection）和 `grep` 筛选、处理训练日志
- 创建带多个窗格（Pane）的持久 tmux 会话，同时运行训练和 GPU 监控
- 使用 `htop`、`nvtop` 和 `nvidia-smi` 监控系统及 GPU 资源
- 使用 SSH、`scp` 和 `rsync` 在本地与远程机器之间传输文件

## 问题（The Problem）

你在终端中花费的时间会比在任何编辑器中都多：运行训练、监控 GPU、追踪日志、使用远程 SSH 会话、管理环境。每种 AI 工作流程都会用到 shell。如果这里效率低，其他地方也快不起来。

本课介绍 AI 工作需要的终端技能。不讲 Unix 历史，不深入 Bash 脚本，只讲你需要的内容。

## 概念（The Concept）

```mermaid
graph TD
    subgraph tmux["tmux 会话（Session）：training"]
        subgraph top["顶部一行"]
            P1["窗格（Pane）1：运行训练<br/>python train.py<br/>训练轮次（Epoch）12/100 ..."]
            P2["窗格 2：GPU 监控<br/>watch -n1 nvidia-smi<br/>GPU: 78% | 显存: 14/24G"]
        end
        P3["窗格 3：日志与实验<br/>tail -f logs/train.log | grep loss"]
    end
```

一个终端同时做三件事。你可以分离会话（Detach），回家后再通过 SSH 连接并重新附加（Reattach）。训练始终继续运行。

```figure
s0-shell-pipeline
```

## 动手实现（Build It）

### 第 1 步：了解你的 shell（Step 1: Know your shell）

检查正在运行哪种 shell：

```bash
echo $SHELL
```

大多数系统使用 `bash` 或 `zsh`，两者都可以。本课程的命令在这两种 shell 中都能使用。

需要掌握的要点：

```bash
# Move around
cd ~/projects/ai-engineering-from-scratch
pwd
ls -la

# History search (most useful shortcut you'll learn)
# Ctrl+R then type part of a previous command
# Press Ctrl+R again to cycle through matches

# Clear terminal
clear   # or Ctrl+L

# Cancel a running command
# Ctrl+C

# Suspend a running command (resume with fg)
# Ctrl+Z
```

### 第 2 步：管道与重定向（Step 2: Piping and redirects）

管道将多个命令连接起来，用于处理日志、筛选输出和串联工具。你会经常使用它。

```bash
# Count how many times "loss" appears in a log
cat train.log | grep "loss" | wc -l

# Extract just the loss values from training output
grep "loss:" train.log | awk '{print $NF}' > losses.txt

# Watch a log file update in real time, filtering for errors
tail -f train.log | grep --line-buffered "ERROR"

# Sort experiments by final accuracy
grep "final_accuracy" results/*.log | sort -t= -k2 -n -r

# Redirect stdout and stderr to separate files
python train.py > output.log 2> errors.log

# Redirect both to the same file
python train.py > train_full.log 2>&1
```

你需要掌握的三种重定向：

| 符号 | 作用 |
|--------|-------------|
| `>` | 将标准输出（stdout）写入文件，覆盖已有内容 |
| `>>` | 将标准输出追加到文件 |
| `2>` | 将标准错误（stderr）写入文件 |
| `2>&1` | 将标准错误发送到与标准输出相同的位置 |
| `\|` | 将一个命令的标准输出作为下一个命令的标准输入（stdin） |

### 第 3 步：后台进程（Step 3: Background processes）

训练运行需要数小时。你不会希望一直开着终端。

```bash
# Run in background (output still goes to terminal)
python train.py &

# Run in background, immune to hangup (closing terminal won't kill it)
nohup python train.py > train.log 2>&1 &

# Check what's running in background
jobs
ps aux | grep train.py

# Bring a background job to foreground
fg %1

# Kill a background process
kill %1
# or find its PID and kill that
kill $(pgrep -f "train.py")
```

`&`、`nohup` 和 `screen`/`tmux` 的区别：

| 方法 | 关闭终端后继续运行？ | 能重新附加？ |
|--------|-------------------------|---------------|
| `command &` | 否 | 否 |
| `nohup command &` | 是 | 否（查看日志文件） |
| `screen` / `tmux` | 是 | 是 |

只要运行超过几分钟，就使用 tmux。

### 第 4 步：tmux（Step 4: tmux）

tmux 可以创建带多个窗格的持久终端会话。它是管理训练运行最实用的工具。

```bash
# Install
# macOS
brew install tmux
# Ubuntu
sudo apt install tmux

# Start a named session
tmux new -s training

# Split horizontally
# Ctrl+B then "

# Split vertically
# Ctrl+B then %

# Navigate between panes
# Ctrl+B then arrow keys

# Detach (session keeps running)
# Ctrl+B then d

# Reattach
tmux attach -t training

# List sessions
tmux ls

# Kill a session
tmux kill-session -t training
```

典型 AI 工作流程会话：

```bash
tmux new -s train

# Pane 1: start training
python train.py --epochs 100 --lr 1e-4

# Ctrl+B, " to split, then run GPU monitor
watch -n1 nvidia-smi

# Ctrl+B, % to split vertically, tail the logs
tail -f logs/experiment.log

# Now detach with Ctrl+B, d
# SSH out, go get coffee, come back
# tmux attach -t train
```

### 第 5 步：使用 htop 和 nvtop 监控（Step 5: Monitoring with htop and nvtop）

```bash
# System processes (better than top)
htop

# GPU processes (if you have NVIDIA GPU)
# Install: sudo apt install nvtop (Ubuntu) or brew install nvtop (macOS)
nvtop

# Quick GPU check without nvtop
nvidia-smi

# Watch GPU usage update every second
watch -n1 nvidia-smi

# See which processes are using the GPU
nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv
```

常用的 `htop` 快捷键：
- `F6` 或 `>`：按列排序（按内存排序可寻找内存泄漏（Memory Leak））
- `F5`：切换树状视图，查看子进程（Child Process）
- `F9`：终止进程
- `/`：搜索进程名称

### 第 6 步：通过 SSH 连接远程 GPU 机器（Step 6: SSH for remote GPU boxes）

租用云端 GPU（Lambda、RunPod、Vast.ai）时，通过 SSH 连接。

```bash
# Basic connection
ssh user@gpu-box-ip

# With a specific key
ssh -i ~/.ssh/my_gpu_key user@gpu-box-ip

# Copy files to remote
scp model.pt user@gpu-box-ip:~/models/

# Copy files from remote
scp user@gpu-box-ip:~/results/metrics.json ./

# Sync a whole directory (faster for many files)
rsync -avz ./data/ user@gpu-box-ip:~/data/

# Port forward (access remote Jupyter/TensorBoard locally)
ssh -L 8888:localhost:8888 user@gpu-box-ip
# Now open localhost:8888 in your browser

# SSH config for convenience
# Add to ~/.ssh/config:
# Host gpu
#     HostName 192.168.1.100
#     User ubuntu
#     IdentityFile ~/.ssh/gpu_key
#
# Then just:
# ssh gpu
```

### 第 7 步：AI 工作中的实用别名（Step 7: Useful aliases for AI work）

将以下内容加入 `~/.bashrc` 或 `~/.zshrc`：

```bash
source phases/00-setup-and-tooling/10-terminal-and-shell/code/shell_aliases.sh
```

也可以只复制所需部分。关键别名（Alias）如下：

```bash
# GPU status at a glance
alias gpu='nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader'

# Kill all Python training processes
alias killtraining='pkill -f "python.*train"'

# Quick virtual environment activate
alias ae='source .venv/bin/activate'

# Watch training loss
alias watchloss='tail -f logs/*.log | grep --line-buffered "loss"'
```

完整集合见 `code/shell_aliases.sh`。

### 第 8 步：常见 AI 终端操作模式（Step 8: Common AI terminal patterns）

以下操作在实践中会反复用到：

```bash
# Run training, log everything, notify when done
python train.py 2>&1 | tee train.log; echo "DONE" | mail -s "Training complete" you@email.com

# Compare two experiment logs side by side
diff <(grep "accuracy" exp1.log) <(grep "accuracy" exp2.log)

# Find the largest model files (clean up disk space)
find . -name "*.pt" -o -name "*.safetensors" | xargs du -h | sort -rh | head -20

# Download a model from Hugging Face
wget https://huggingface.co/model/resolve/main/model.safetensors

# Untar a dataset
tar xzf dataset.tar.gz -C ./data/

# Count lines in all Python files (see how big your project is)
find . -name "*.py" | xargs wc -l | tail -1

# Check disk space (training data fills disks fast)
df -h
du -sh ./data/*

# Environment variable check before training
env | grep -i cuda
env | grep -i torch
```

## 实际应用（Use It）

本课程中各工具的使用场景如下：

| 工具 | 使用场景 |
|------|----------------|
| tmux | 每次训练运行（阶段 3 及以后） |
| `tail -f` + `grep` | 监控训练日志 |
| `nohup` / `&` | 快速执行后台任务 |
| `htop` / `nvtop` | 排查训练缓慢、内存不足（Out of Memory，OOM）错误 |
| SSH + `rsync` | 在云端 GPU 上工作 |
| 管道与重定向 | 处理实验结果 |
| 别名 | 节省重复输入命令的时间 |

## 练习（Exercises）

1. 安装 tmux，创建含三个窗格的会话：一个运行 `htop`，另一个运行 `watch -n1 date`，第三个运行 Python 脚本。分离会话后再重新附加。
2. 将 `code/shell_aliases.sh` 中的别名加入 shell 配置，用 `source ~/.zshrc`（或 `~/.bashrc`）重新加载。
3. 使用 `for i in $(seq 1 100); do echo "epoch $i loss: $(echo "scale=4; 1/$i" | bc)"; sleep 0.1; done > fake_train.log` 创建模拟训练日志，再用 `grep`、`tail` 和 `awk` 只提取损失值（Loss）。
4. 为你可以访问的服务器配置 SSH 条目，或使用 `localhost` 练习语法。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 命令解释器（Shell） | “终端” | 解释命令的程序，例如 bash、zsh、fish |
| tmux | “终端复用器（Terminal Multiplexer）” | 让你在一个窗口内运行多个终端会话，并支持分离和重新附加的程序 |
| 管道（Pipe） | “那根竖线” | 将一个命令的输出作为另一个命令输入的 `\|` 运算符 |
| 进程标识符（Process ID，PID） | “进程 ID” | 分配给每个运行进程的唯一编号，用于监控或终止该进程 |
| nohup | “不挂断（No Hangup）” | 让命令不受挂断信号影响，因此关闭终端不会终止它 |
| 安全外壳协议（Secure Shell，SSH） | “连接服务器” | 在远程机器上运行命令的加密协议 |
