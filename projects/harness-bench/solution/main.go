package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"
)

func run() error {
	casesPath := flag.String("cases", "fixtures/orchard-cases.json", "用例 JSON 数组")
	recordingPath := flag.String("recording", "fixtures/orchard-recording.json", "有限响应记录")
	endpoint := flag.String("endpoint", "", "可选 chat-completions HTTP 端点；启用后停用响应记录")
	modelName := flag.String("model", "", "HTTP 模型标识")
	keyEnv := flag.String("key-env", "", "保存服务商密钥的环境变量名")
	temperature := flag.Float64("temperature", 0, "HTTP 采样温度")
	maxTokens := flag.Int("max-tokens", 128, "HTTP 输出词元上限")
	budget := flag.Int("budget", 4, "每种策略可用的模型调用次数")
	timeout := flag.Duration("timeout", 30*time.Second, "每种策略的总期限")
	output := flag.String("out", "", "写入 JSON 凭据和每次调用的轨迹")
	flag.Parse()
	if *budget < 0 || *budget > 10000 || *timeout <= 0 || *timeout > 5*time.Minute {
		return ErrInvalid
	}
	data, err := ReadBounded(*casesPath)
	if err != nil {
		return err
	}
	cases, err := Cases(data, 1000)
	if err != nil {
		return err
	}
	if len(cases) == 0 {
		return ErrInvalid
	}
	var factory func() ContextModel
	var config ModelConfig
	scope := ""
	if *endpoint == "" {
		data, err = ReadBounded(*recordingPath)
		if err != nil {
			return err
		}
		recording, err := LoadRecording(data)
		if err != nil {
			return err
		}
		config = ModelConfig{Adapter: "recording", Model: recording.Model, Settings: recording.Settings, RecordingSHA256: Fingerprint(recording)}
		factory = recording.NewModel
		scope = recording.Kind
	} else {
		config = ModelConfig{Adapter: "http", Model: *modelName, Endpoint: *endpoint, Settings: Settings{Temperature: *temperature, MaxTokens: *maxTokens}}
		model, err := HTTPModel(config, *keyEnv)
		if err != nil {
			return err
		}
		factory = func() ContextModel { return model }
		scope = "live_http_sequential_runs"
	}
	results := []Result{}
	for _, policy := range []string{"baseline", "retry-errors", "evidence"} {
		ctx, cancel := context.WithTimeout(context.Background(), *timeout)
		result, err := EvaluatePolicy(ctx, policy, policy, cases, factory(), *budget, Fingerprint(config))
		cancel()
		if err != nil {
			return err
		}
		results = append(results, result)
	}
	table, err := Leaderboard(results)
	if err != nil {
		return err
	}
	fmt.Printf("SCOPE %s\nMODEL %s\nDATASET %s\n%s", scope, config.Model, Fingerprint(cases), table)
	if *output != "" {
		receipt := struct {
			SchemaVersion int         `json:"schema_version"`
			Scope         string      `json:"scope"`
			Model         ModelConfig `json:"model"`
			Results       []Result    `json:"results"`
		}{1, scope, config, results}
		data, err = json.MarshalIndent(receipt, "", "  ")
		if err != nil {
			return err
		}
		return os.WriteFile(*output, append(data, '\n'), 0600)
	}
	return nil
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "harness:", err)
		os.Exit(1)
	}
}
