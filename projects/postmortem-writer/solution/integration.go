// 导入显式日志并校验来源、引文和审批状态；审批标签不等同于身份认证。
// JSON 字段、文本凭据和 Go 模板控制指令保留原值，仅翻译页面固定文案。
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"strings"
)

type LocatedEvent struct {
	Event Event
	Line  int
}
type ReviewedClaim struct {
	Text     string            `json:"text"`
	Evidence []string          `json:"evidence"`
	Quotes   map[string]string `json:"quotes"`
	State    string            `json:"state"`
	Reviewer string            `json:"reviewer"`
}
type Action struct {
	Task  string `json:"task"`
	Owner string `json:"owner"`
	State string `json:"state"`
}
type Review struct {
	SourceSHA256 string          `json:"sourceSHA256"`
	Impact       string          `json:"impact"`
	Claims       []ReviewedClaim `json:"claims"`
	Actions      []Action        `json:"actions"`
}
type Packet struct {
	SourceSHA256, Impact string
	Events               []LocatedEvent
	Claims               []ReviewedClaim
	Actions              []Action
	Pending              int
	Text                 string
}

func strictJSON(raw []byte, out any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		return err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return ErrInvalid
	}
	return nil
}
func ImportJSONL(raw []byte) ([]LocatedEvent, error) {
	if len(raw) > 2<<20 {
		return nil, ErrLimit
	}
	var records []LocatedEvent
	var ledger strings.Builder
	for i, line := range bytes.Split(raw, []byte("\n")) {
		if len(bytes.TrimSpace(line)) == 0 {
			continue
		}
		var row struct {
			ID      string `json:"id"`
			Second  *int   `json:"second"`
			Kind    string `json:"kind"`
			Message string `json:"message"`
		}
		if err := strictJSON(line, &row); err != nil || row.Second == nil {
			return nil, fmt.Errorf("line %d: %w", i+1, ErrInvalid)
		}
		if strings.ContainsAny(row.ID+row.Kind+row.Message, "\t\r\n") {
			return nil, fmt.Errorf("line %d: %w", i+1, ErrInvalid)
		}
		fmt.Fprintf(&ledger, "%s\t%d\t%s\t%s\n", row.ID, *row.Second, row.Kind, row.Message)
		records = append(records, LocatedEvent{Event{row.ID, *row.Second, row.Kind, row.Message}, i + 1})
		if len(records) > 10000 {
			return nil, ErrLimit
		}
	}
	if len(records) == 0 {
		return nil, ErrInvalid
	}
	if _, err := Parse(ledger.String()); err != nil {
		return nil, err
	}
	return records, nil
}
func BuildPacket(raw, reviewJSON []byte) (Packet, error) {
	var packet Packet
	events, err := ImportJSONL(raw)
	if err != nil {
		return packet, err
	}
	if len(reviewJSON) > 1<<20 {
		return packet, ErrLimit
	}
	var review Review
	if err := strictJSON(reviewJSON, &review); err != nil {
		return packet, err
	}
	sum := sha256.Sum256(raw)
	hash := hex.EncodeToString(sum[:])
	if review.SourceSHA256 != "" && review.SourceSHA256 != hash {
		return packet, fmt.Errorf("review source changed: %w", ErrConflict)
	}
	if strings.TrimSpace(review.Impact) == "" || len(review.Claims) > 100 || len(review.Actions) > 100 {
		return packet, ErrInvalid
	}
	plain := make([]Event, len(events))
	lookup := map[string]Event{}
	locations := map[string]int{}
	for i, event := range events {
		plain[i] = event.Event
		lookup[event.Event.ID] = event.Event
		locations[event.Event.ID] = event.Line
	}
	claims := []Claim{}
	pending := 0
	for _, claim := range review.Claims {
		item := Claim{claim.Text, claim.Evidence}
		if err := Verify(item, plain); err != nil {
			return packet, err
		}
		if claim.State != "pending" && claim.State != "approved" {
			return packet, ErrInvalid
		}
		if claim.State == "approved" && (review.SourceSHA256 != hash || strings.TrimSpace(claim.Reviewer) == "") {
			return packet, fmt.Errorf("approval requires matching source and reviewer: %w", ErrInvalid)
		}
		if len(claim.Quotes) != len(claim.Evidence) {
			return packet, ErrInvalid
		}
		for _, id := range claim.Evidence {
			quote := claim.Quotes[id]
			if strings.TrimSpace(quote) == "" || !strings.Contains(lookup[id].Message, quote) {
				return packet, fmt.Errorf("quote for %s: %w", id, ErrInvalid)
			}
		}
		if claim.State == "pending" {
			pending++
		}
		claims = append(claims, item)
	}
	for _, action := range review.Actions {
		if strings.TrimSpace(action.Task) == "" || (action.State != "open" && action.State != "doing" && action.State != "done") || (action.State != "open" && strings.TrimSpace(action.Owner) == "") {
			return packet, ErrInvalid
		}
	}
	text, err := Report(plain, claims, 100)
	if err != nil {
		return packet, err
	}
	ordered, err := Timeline(plain, int(^uint(0)>>1))
	if err != nil {
		return packet, err
	}
	sorted := make([]LocatedEvent, len(ordered))
	for i, event := range ordered {
		sorted[i] = LocatedEvent{event, locations[event.ID]}
	}
	var receipt strings.Builder
	receipt.WriteString(text)
	fmt.Fprintf(&receipt, "SOURCE SHA256 %s\nIMPACT %q\nPENDING %d\n", hash, review.Impact, pending)
	for _, event := range sorted {
		fmt.Fprintf(&receipt, "LOCATION event=%q line=%d\n", event.Event.ID, event.Line)
	}
	for _, claim := range review.Claims {
		fmt.Fprintf(&receipt, "DECISION claim=%q state=%s reviewer=%q\n", claim.Text, claim.State, claim.Reviewer)
		for _, id := range claim.Evidence {
			fmt.Fprintf(&receipt, "QUOTE event=%q text=%q\n", id, claim.Quotes[id])
		}
	}
	for _, action := range review.Actions {
		fmt.Fprintf(&receipt, "ACTION task=%q owner=%q state=%s\n", action.Task, action.Owner, action.State)
	}
	packet = Packet{hash, review.Impact, sorted, review.Claims, review.Actions, pending, receipt.String()}
	return packet, nil
}
func RenderPacket(packet Packet) (string, error) {
	const page = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>事故证据工作台</title><style>body{font:17px/1.6 system-ui;background:#f3f3ed;color:#182f34;margin:0}main{max-width:1050px;margin:auto;padding:28px}section{padding:20px;background:white;border:1px solid #ccd9d6;border-radius:12px;margin:18px 0}h1{font-size:clamp(28px,5vw,45px);line-height:1.15}code{overflow-wrap:anywhere}li{margin:12px 0}blockquote{margin:8px 0;padding:8px 14px;border-left:3px solid #188372}a{color:#13675c}.pending{color:#835e12}small{display:block;color:#51666c}</style><main><p>事故证据工作台</p><h1>审阅记录能够支持的结论。</h1><p>{{.Pending}} 项论断待审阅。来源引用和逐字引文已校验；因果解释与审阅者身份未经认证。</p><section><h2>所报告的影响</h2><p>{{.Impact}}</p></section><section><h2>时间线</h2><ol>{{range .Events}}<li id="event-{{.Event.ID}}"><strong>{{.Event.Second}} 秒 · {{.Event.Kind}}</strong><p>{{.Event.Message}}</p><small>{{.Event.ID}} · input line {{.Line}}（输入行号）</small></li>{{end}}</ol></section><section><h2>论断与审阅决策</h2>{{range .Claims}}<article><h3>{{.Text}}</h3><p class="pending">{{.State}}{{if .Reviewer}} · 审阅者：{{.Reviewer}}{{end}}</p>{{$claim := .}}{{range .Evidence}}<a href="#event-{{.}}">{{.}}</a><blockquote>{{index $claim.Quotes .}}</blockquote>{{end}}</article>{{end}}</section><section><h2>后续工作</h2><ul>{{range .Actions}}<li>{{.Task}}<small>{{.State}} · 负责人：{{if .Owner}}{{.Owner}}{{else}}未分配{{end}}</small></li>{{end}}</ul></section><section><h2>来源凭据</h2><code>{{.SourceSHA256}}</code><p>来源发生变化后，绑定此哈希的批准将失效。</p></section></main></html>`
	var output bytes.Buffer
	parsed, err := template.New("packet").Parse(page)
	if err != nil {
		return "", err
	}
	err = parsed.Execute(&output, packet)
	return output.String(), err
}
