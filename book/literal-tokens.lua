function RawInline(inline)
  if inline.format ~= "html" then
    return nil
  end

  -- 课程中的模型/文档占位词元是字面文本，不是 HTML 标签。
  if inline.text == "<image>"
    or inline.text == "<PERSON>"
    or inline.text:match("^<image%s+[%w_-]+>$")
    or inline.text:match("^<doc%s+[%w_-]+>$")
    or inline.text:match("^<图像%s+[%w_-]+>$") then
    return pandoc.Str(inline.text)
  end
end
