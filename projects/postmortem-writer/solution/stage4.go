// 第 4 阶段：先校验全部论断，再生成有序材料包；文本凭据保持原契约。
package main

import (
	"fmt"
	"strings"
)

func Report(events []Event, claims []Claim, maxClaims int) (string, error) {
	if maxClaims < 0 || len(claims) > maxClaims {
		return "", ErrLimit
	}
	for _, c := range claims {
		if e := Verify(c, events); e != nil {
			return "", e
		}
	}
	rows, e := Timeline(events, int(^uint(0)>>1))
	if e != nil {
		return "", e
	}
	var out strings.Builder
	out.WriteString("INCIDENT PACKET\nProvenance checked; causality requires review.\n")
	for _, v := range rows {
		fmt.Fprintf(&out, "[%s] t=%d %s %q\n", v.ID, v.Second, v.Kind, v.Message)
	}
	for _, c := range claims {
		fmt.Fprintf(&out, "CLAIM %q evidence=%s\n", c.Text, strings.Join(c.Evidence, ","))
	}
	return out.String(), nil
}
