# 任务框架：防止注册时出现重复邮箱地址（Task Frame: Prevent duplicate email addresses during signup）

状态（Status）：READY

## 仓库事实（Repository facts）
- 账户写入使用 AccountStore（`app/accounts.py:18`）
- 重复错误使用状态码 409（`tests/test_accounts.py:44`）

## 允许路径（Allowed paths）
- `app/accounts.py`
- `tests/test_accounts.py`

## 禁止路径（Forbidden paths）
- `migrations/**`
- `deploy/**`

## 验收证据（Acceptance evidence）
- `python3 -m unittest tests.test_accounts`

## 未知项（Unknowns）
- 邮箱比较是否不区分大小写
