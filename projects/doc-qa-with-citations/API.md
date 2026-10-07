# 公共实现契约

导入 query(directory, question, model)。模型回调返回 JSON {source:chunk_id,quote:exact_text}。--response 接受预先记录的响应，并应用相同的校验门禁。

默认回答器在本地运行，采用抽取式回答。词汇重叠无法证明语义蕴含。有效引用仍可能与问题无关或已经过时；内容哈希让读者能够检测来源变化。

### adapter.py

```python
def adapt_splits(doc, parts)
def framework_qa(question, doc, response)
```

### answer.py

```python
def answer(question, chunks, model)
```

### documents.py

```python
def load_documents(root)
def chunk_document(doc, size=200, overlap=30)
```

### retrieval.py

```python
def retrieve(chunks, query, k=3)
```

阶段测试规定正常结果和应拒绝的输入。不要将学习者代码的导入替换为参考解答的导入。最后一个阶段还会通过随附的输入驱动程序测试你的累积实现。
