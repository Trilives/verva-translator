# Local translation and image text decisions

Research checked on 2026-10-24. The desktop app remains Windows-first.

## Local translation

Ollama owns model downloads and inference. Verva calls its loopback API from Rust
for installed/running state, streamed pulls, loading and unloading. Choosing
"Use in translation" creates an OpenAI-compatible profile at
`http://127.0.0.1:11434/v1`, so the existing translation workspace and settings
use the same profile as remote models. Ollama must be installed and running.
"Stop model" unloads that model from memory; it does not shut down Ollama.

The catalog has five size tiers, ordered by practical recommendation rather
than parameter count:

1. **4B starting tier:** TranslateGemma 4B for translation; Qwen3.5 4B for a
   general multilingual alternative. TranslateGemma has direct evidence of
   improvement over its own Gemma 3 4B base, but no directly comparable test
   against Qwen3.5 4B was found, so their relative ranking is provisional.
2. **2B lighter tier:** Qwen3.5 2B. Its published WMT24++ result is much
   stronger than the 0.8B sibling under the same Qwen evaluation.
3. **About 1B lowest-memory tier:** Qwen3.5 0.8B and Gemma 3 1B for short,
   simple text. No same-setting Chinese↔English comparison of these two was
   found, and their translations need careful review.
4. **9–12B capable-device tier:** TranslateGemma 12B for translation and
   Qwen3.5 9B as the general alternative. Select these only with enough
   RAM or VRAM.
5. **27B high-memory tier:** TranslateGemma 27B, only when the device can
   support it. Its benchmark gain over 12B is smaller than its extra memory
   cost for most users.

Download sizes are estimates from the Ollama registry;
runtime memory exceeds the model file size and depends on context and backend.

- [Ollama Windows runtime](https://docs.ollama.com/windows)
- [Ollama model lifecycle API](https://docs.ollama.com/api/generate)
- [Qwen3.5 model sizes](https://ollama.com/library/qwen3.5/tags)
- [Qwen3.5 0.8B model card and translation benchmark](https://huggingface.co/Qwen/Qwen3.5-0.8B)
- [Qwen3.5 0.8B on ModelScope](https://modelscope.cn/models/Qwen/Qwen3.5-0.8B)
- [Gemma 3 1B model size](https://ollama.com/library/gemma3)
- [Gemma 3 1B model card](https://huggingface.co/google/gemma-3-1b-it)
- [TranslateGemma model sizes and prompt format](https://ollama.com/library/translategemma)

The 1B review also checked dedicated translation models. Meta's NLLB 600M
supports Chinese and English but its CC-BY-NC license and research-only model
card make it a poor default for this app; it also needs a separate seq2seq
runtime. Tencent's Hy-MT2 1.8B is translation-focused but is above the 1B
tier and its Ollama package is community-maintained. These are research
alternatives, not one-click catalog entries.

- [NLLB 600M model card](https://huggingface.co/facebook/nllb-200-distilled-600M)
- [Tencent Hy-MT2 1.8B model card](https://huggingface.co/tencent/Hy-MT2-1.8B)
- [Hy-MT2 community Ollama package](https://ollama.com/kaelri/hy-mt2)

### Translation benchmark check (2026-10-24)

These results inform the catalog tiers. They are published evaluations, not
tests of the app's quantized Ollama models. Scores from different metrics,
model cards, and prompt settings must not be ranked against each other.

| Evaluation | Models | Result | What it supports |
| --- | --- | --- | --- |
| Qwen WMT24++, XCOMET-XXL (higher is better), 55 languages, thinking mode | Qwen3.5 0.8B / 2B | 27.2 / 45.8 | 0.8B is a fallback for limited hardware, not the quality default. |
| Qwen WMT24++, XCOMET-XXL (higher is better), 55 languages, separate 4B card | Qwen3.5 4B / 9B | 66.6 / 72.6 | 4B is a reasonable general starting tier; 9B needs more resources. |
| Google WMT24++, MetricX (lower is better) and COMET-22 (higher is better) | Gemma 3 4B / TranslateGemma 4B | 6.97 → 5.32 / 77.2 → 80.1 | Translation training improves the 4B Gemma baseline. |
| Google WMT24++ English→Simplified Chinese, MetricX (lower is better) | Gemma 3 4B / TranslateGemma 4B | 3.27 → 2.66 | The improvement also appears on this app's common English→Chinese direction. |
| Gemma 3 model card, WMT24++ chrF (higher is better), *pretrained* checkpoints | Gemma 3 1B / 4B | 36.7 / 48.4 | Small base models have a quality gap; this does **not** measure the 1B instruction model in the app. |
| Index-Translate evaluation, WMT24++ COMET-22 (higher is better) | Index-Translate 2B / Hy-MT2 1.8B / Qwen3.5 2B base | 0.8489 / 0.8401 / 0.6933 | Translation-specialized small models merit attention. This is a model maker's comparison and does not evaluate the app's 1B options. |
| Tencent Hy-MT2 FLORES-200 Chinese⇔other, XCOMET-XXL (higher is better) | 1.8B BF16 / Q4_K_M | 83.49 / 82.22 | Quantization can preserve much of the quality, but this 1.8B model uses a community Ollama package and is outside the requested 1B tier. |

No directly comparable, independent Chinese↔English translation benchmark was
found for the two catalog 1B options (Qwen3.5 0.8B and Gemma 3 1B instruction)
under the same prompt and quantization. Their order is provisional. The app
does not claim that Qwen3.5 0.8B beats Gemma 3 1B. A local head-to-head test
requires downloading both models; Ollama was unavailable on this development
machine at review time.

- [Qwen3.5 0.8B and 2B benchmark](https://huggingface.co/Qwen/Qwen3.5-0.8B)
- [Qwen3.5 4B and 9B benchmark](https://huggingface.co/Qwen/Qwen3.5-4B)
- [TranslateGemma technical report, Table 1](https://arxiv.org/pdf/2601.09012)
- [Gemma 3 model card](https://huggingface.co/google/gemma-3-1b-it)
- [Index-Translate evaluation](https://github.com/bilibili/Index-Translate/blob/main/docs/evaluation.md)
- [Hy-MT2 technical report, Table 5](https://arxiv.org/pdf/2605.22064)

TranslateGemma has a dedicated prompt path. It emits translation directly;
Verva does not require the language marker used for general chat models.

## Image to text

PP-OCRv6 Small is the default. It detects and recognizes Chinese and English
on the CPU, independent of Ollama. Model assets are downloaded on first use to
the app's local data directory, verified against registered SHA-256 hashes,
and reused offline. A Rust ONNX pipeline avoids requiring Python at runtime.
The app limits input to 12 MB and 25 million pixels.

Paddle's published comparison places PP-OCRv6 Small above PP-OCRv5 Mobile in
its internal detection and recognition measures, while CPU end-to-end timing
for the two is close on its Xeon 8350C test machine. This is a model-selection
reason, not an app-level accuracy guarantee. The local smoke test uses a
Chinese/English sample and checks both scripts are transcribed.

- [PP-OCRv6 official model comparison](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv6/PP-OCRv6.md)
- [Rust ONNX pipeline and model cache](https://github.com/White-NX/rapidocr-rs)

The extracted text stays editable. If the user chooses translation, Verva
sends that text through the selected translation profile. When that profile is
remote, the extracted text is sent to that provider; OCR itself stays local.
