package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"time"
)

func output(value any) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}
func runCLI() error {
	if len(os.Args) < 2 {
		return fmt.Errorf("usage: farm init|worker|run|status|demo [flags]")
	}
	command := os.Args[1]
	flags := flag.NewFlagSet(command, flag.ContinueOnError)
	directory := flags.String("store", "farm-data", "同主机持久化目录")
	input := flags.String("input", "samples/cases.json", "已记录预测的 JSON 数组")
	shards := flags.Int("shards", 4, "固定分片数")
	workers := flags.Int("workers", 2, "最大并发工作进程数")
	worker := flags.String("worker-id", "manual-worker", "租约持有者")
	now := flags.Int64("now-ms", -1, "测试用逻辑时钟；默认使用实际时钟的毫秒值")
	ttl := flags.Int64("lease-ms", 30000, "领取后的租约时长")
	delay := flags.Int64("delay-ms", 0, "领取后注入的延迟，用于故障实验")
	crash := flags.Bool("crash-after-claim", false, "领取信息持久化后立即以 86 退出")
	if err := flags.Parse(os.Args[2:]); err != nil {
		return err
	}
	if flags.NArg() != 0 || *now < -1 || *delay < 0 || *delay > 60000 {
		return ErrInvalid
	}
	if command == "demo" {
		return demoFarm(*input, *shards, *workers)
	}
	if command == "init" || command == "run" {
		var cases []EvalCase
		if err := readJSON(*input, &cases); err != nil {
			return err
		}
		if err := InitFarm(*directory, cases, *shards); err != nil {
			return err
		}
	}
	switch command {
	case "init", "status":
		value, err := FarmStatus(*directory)
		if err != nil {
			return err
		}
		return output(value)
	case "worker":
		clock := func() int64 { return time.Now().UnixMilli() }
		if *now >= 0 {
			clock = func() int64 { return *now }
		}
		value, err := WorkShard(*directory, WorkerOptions{*worker, clock, *ttl, time.Duration(*delay) * time.Millisecond, *crash})
		if err != nil {
			return err
		}
		return output(value)
	case "run":
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		value, err := RunFarm(ctx, *directory, *workers, *now, *ttl, *delay)
		if err != nil {
			return err
		}
		if err = output(value); err != nil {
			return err
		}
		if !value["complete"].(bool) {
			return fmt.Errorf("run pending: active unexpired leases; retry after expiry")
		}
		return nil
	default:
		return fmt.Errorf("unknown command %s", command)
	}
}
func demoFarm(input string, shards, workers int) error {
	directory, err := os.MkdirTemp("", "eval-farm-demo-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(directory)
	var cases []EvalCase
	if err = readJSON(input, &cases); err != nil {
		return err
	}
	if err = InitFarm(directory, cases, shards); err != nil {
		return err
	}
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	child := exec.Command(executable, "worker", "--store", directory, "--worker-id", "lost-worker", "--now-ms", "100", "--lease-ms", "10", "--crash-after-claim")
	raw, err := child.CombinedOutput()
	fmt.Print(string(raw))
	exit, crashed := err.(*exec.ExitError)
	if !crashed || exit.ExitCode() != 86 {
		return fmt.Errorf("expected crash exit86, received %v", err)
	}
	before, err := FarmStatus(directory)
	if err != nil {
		return err
	}
	if err = output(map[string]any{"phase": "after_worker_crash", "snapshot": before}); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	after, err := RunFarm(ctx, directory, workers, 110, 30, 0)
	if err != nil {
		return err
	}
	return output(map[string]any{"phase": "after_recovery", "snapshot": after})
}
func main() {
	if err := runCLI(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
