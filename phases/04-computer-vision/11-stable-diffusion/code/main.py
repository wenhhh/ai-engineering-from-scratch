"""
Stable Diffusion 使用示例。实际推理（Inference）需要 `diffusers`、`transformers` 和 GPU。
在没有模型的 CPU 环境中运行时，只展示说明，不执行实际推理。
"""

import os
import torch


def has_diffusers():
    try:
        import diffusers  # noqa: F401
        return True
    except ImportError:
        return False


def describe_pipeline():
    print("[Stable Diffusion 流水线（Pipeline）]")
    print("  文本编码器（Text encoder）:   CLIP-L (SD 1.5) / CLIP-L+G (SDXL) / T5-XXL (SD3, FLUX)")
    print("  UNet 参数（Parameters）:    860M (SD 1.5) / 2.6B (SDXL) / 12B (FLUX)")
    print("  VAE 潜变量（Latent）:     512x512 输入对应 4 x 64 x 64，1024x1024 对应 4 x 128 x 128")
    print("  VAE 缩放系数（Scale）:      0.18215 (SD 1.5/2), 0.13025 (SDXL)")
    print("  默认无分类器引导（CFG）:    7.5")


def cfg_sweep_demo():
    values = [1.0, 3.0, 5.0, 7.5, 10.0, 15.0]
    print("\n[可在实际流水线中尝试的 CFG 扫描值（Sweep values）]")
    for w in values:
        effect = (
            "无条件（Unconditional）" if w <= 1.0
            else "有创意，但对提示词（Prompt）的遵循较弱" if w < 5.0
            else "标准效果" if w <= 8.0
            else "遵循较强，可能过饱和（Oversaturation）" if w <= 12.0
            else "明显伪影（Artefacts）"
        )
        print(f"  w={w:5.1f}  预期效果: {effect}")


def text_to_image_stub(prompt, seed=42):
    print(f"\n[文生图（Text-to-image）] 提示词（保留英文示例）={prompt!r} 随机种子（Seed）={seed}")
    if not has_diffusers():
        print("  未安装 diffusers。运行 `pip install diffusers transformers accelerate` 后可执行。")
        return None
    if not torch.cuda.is_available():
        print("  CUDA 不可用；在 CPU 上运行 SD 耗时很长。跳过实际调用。")
        return None
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
    ).to("cuda")
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    gen = torch.Generator("cuda").manual_seed(seed)
    out = pipe(prompt, guidance_scale=7.5, num_inference_steps=25, generator=gen).images[0]
    path = os.path.expanduser("~/sd_demo.png")
    out.save(path)
    print(f"  已保存: {path}")


def lora_training_sketch():
    print("\n[LoRA 训练伪代码（Pseudocode）]")
    pseudo = """
for step, batch in enumerate(dataloader):
    images, prompts = batch
    latents = vae.encode(images).latent_dist.sample() * 0.18215
    t = torch.randint(0, num_train_timesteps, (batch_size,))
    noise = torch.randn_like(latents)
    noisy_latents = scheduler.add_noise(latents, noise, t)
    text_emb = text_encoder(tokenizer(prompts))
    pred_noise = unet(noisy_latents, t, text_emb)       # 已注入 LoRA 权重（Weights）
    loss = F.mse_loss(pred_noise, noise)
    loss.backward()
    optimizer.step()
"""
    print(pseudo)


def main():
    describe_pipeline()
    cfg_sweep_demo()
    text_to_image_stub("a dog riding a skateboard in tokyo, studio ghibli style")
    lora_training_sketch()


if __name__ == "__main__":
    main()
