# Vera

## What we did

- Initialized a **Git repository** in the `Vera` folder.
- Added a `.gitignore` entry for the confidential PDF `Auditor Manual Final_ThirdParty(1).pdf` so that no secret material is ever pushed to the remote.
- Performed an **initial commit** that includes every source file, data, sample reports, PDFs, and generated markdown bundles.
- Pushed the commit to the remote GitHub repository **https://github.com/Sanil‑Samir‑Mhatre/Vera** (master branch).

## Why we did it

The goal was to make the entire Vera code‑base and its generated artefacts publicly available while keeping the sensitive PDF out of the public history. Publishing the repository enables:

1. **Collaboration** – other developers can clone, explore, and contribute.
2. **Reproducibility** – all scripts, data, and sample reports are version‑controlled, so experiments can be rerun exactly.
3. **Transparency** – stakeholders can inspect the methodology, benchmark results, and compliance checklists.
4. **Safety** – the confidential PDF is deliberately excluded to avoid accidental data leakage.

## How we did it

1. **Created `.gitignore`** with the line:
   ```
   Auditor Manual Final_ThirdParty(1).pdf
   ```
   This tells Git to ignore the file permanently.
2. Ran the standard Git workflow from the project root:
   ```bash
   git init
   git remote add origin https://github.com/Sanil‑Samir‑Mhatre/Vera.git
   git add .
   git commit -m "Initial commit of Vera project (excluding confidential PDF)"
   git push -u origin master
   ```
3. Verified the push with `git status` and `git ls-tree` to ensure all expected files are tracked.
4. The remote now shows the complete repository tree, accessible via the GitHub web UI.

## Main purpose of Vera

Vera is a **Python‑based research and automation toolkit** designed to:

- **Teach and demo NLP concepts** – classic pipelines, modern transformer‑based models, and retrieval‑augmented generation (RAG) are provided as standalone scripts under `pages/`.
- **Generate synthetic domain‑specific corpora** from raw text snippets (e.g., milk processing, retail) using `generate_dataset.py`.
- **Benchmark multiple NLP models** on the synthetic data, storing metrics in a structured format (`precompute_benchmarks.py`).
- **Produce polished PDF reports** that summarize benchmark outcomes, complete with tables, plots, and narrative text (`generate_sample_pdfs.py`).
- **Bundle compliance documentation** (OKF bundles, checklists) for industries such as meat processing, storage, and transport, facilitating audit‑trail creation.

In essence, Vera provides an end‑to‑end pipeline from **data creation → model evaluation → reporting → compliance packaging**, making it a valuable resource for data‑science teams, educators, and auditors.

---

*Repository created and populated on 2026‑10‑12.*
