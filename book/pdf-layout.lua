
local function has_devanagari(text)
  for _, cp in utf8.codes(text) do
    if cp >= 0x900 and cp <= 0x97F then return true end
  end
  return false
end

-- 不在组合字内部插入断行；只为天城文片段切换字体，拉丁代码仍用原等宽字体。
local function devanagari_code(text, inline)
  local out, run, hex = {}, {}, {}
  local function flush()
    if #run > 0 then
      table.insert(out, '\\bookdevanagari{' .. table.concat(hex) .. '}{' .. table.concat(run) .. '}')
      run, hex = {}, {}
    end
  end
  for _, cp in utf8.codes(text) do
    if cp >= 0x900 and cp <= 0x97F then
      table.insert(run, utf8.char(cp))
      table.insert(hex, string.format('%04X', cp))
    else
      flush()
      local char = utf8.char(cp)
      if inline then
        local escapes = { ['\\']='\\textbackslash{}', ['{']='\\{', ['}']='\\}',
          ['%']='\\%', ['#']='\\#', ['$']='\\$', ['&']='\\&', ['_']='\\_',
          ['^']='\\textasciicircum{}', ['~']='\\textasciitilde{}' }
        char = escapes[char] or char
      elseif char == '\\' or char == '{' or char == '}' then
        char = '\\' .. char
      end
      table.insert(out, char)
    end
  end
  flush()
  return table.concat(out)
end

function CodeBlock(block)
  if FORMAT ~= 'latex' or not has_devanagari(block.text) then return nil end
  -- 此类少量混合文字代码取消颜色高亮，保留内容和换行；其他代码块不受影响。
  return pandoc.RawBlock('latex', '\\begin{Verbatim}[breaknonspaceingroup=false,commandchars=\\\\\\{\\}]\n'
    .. devanagari_code(block.text, false) .. '\n\\end{Verbatim}')
end

function Code(inline)
  if FORMAT ~= "latex" then
    return nil
  end
  if has_devanagari(inline.text) then
    return pandoc.RawInline('latex', '\\texttt{' .. devanagari_code(inline.text, true) .. '}')
  end
  local escaped = inline.text:gsub("([\\%%#{}%^ &$~_])", "\\%1")
  return pandoc.RawInline("latex", "\\EscVerb{" .. escaped .. "}")
end

function Table(block)
  if FORMAT ~= "latex" then
    return nil
  end
  -- 分卷总览的第一列只有卷号，第二列是长标题；不要均分列宽。
  local cells = block.head.rows[1] and block.head.rows[1].cells or {}
  if #cells == 3 and pandoc.utils.stringify(cells[1].contents) == "卷"
      and pandoc.utils.stringify(cells[2].contents) == "标题"
      and pandoc.utils.stringify(cells[3].contents) == "课程阶段" then
    block.colspecs[1][2] = 0.08
    block.colspecs[2][2] = 0.72
    block.colspecs[3][2] = 0.20
  end
  return block:walk({
    Str = function(inline)
      if #inline.text <= 20 or inline.text:find("[^ -~]") then
        return nil
      end
      local wrapped = pandoc.List()
      for character in inline.text:gmatch(".") do
        if #wrapped > 0 then
          wrapped:insert(pandoc.RawInline("latex", "\\allowbreak{}"))
        end
        wrapped:insert(pandoc.Str(character))
      end
      return wrapped
    end,
  })
end


function Link(link)
  if FORMAT ~= "latex" or not link.classes:includes("uri")
      or pandoc.utils.stringify(link.content) ~= link.target then
    return nil
  end
  -- 仅修复裸网址后的中文标点；显式 Markdown 链接和含中文的 URL 路径保持原样。
  local boundaries = { [0xFF0C]=true, [0x3002]=true, [0xFF1B]=true,
    [0xFF1A]=true, [0xFF01]=true, [0xFF1F]=true, [0x3001]=true,
    [0xFF08]=true, [0xFF09]=true, [0x3010]=true, [0x3011]=true,
    [0x300C]=true, [0x300D]=true, [0x201C]=true, [0x201D]=true }
  for index, codepoint in utf8.codes(link.target) do
    if boundaries[codepoint] then
      local suffix = link.target:sub(index)
      link.target = link.target:sub(1, index - 1)
      link.content = pandoc.Inlines({pandoc.Str(link.target)})
      return pandoc.Inlines({link, pandoc.Str(suffix)})
    end
  end
end
