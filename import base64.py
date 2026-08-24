import base64
import os

# 1. Trouve le chemin absolu du dossier où se trouve ce script Python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Construit les chemins complets en utilisant le dossier du script
files_to_convert = {
    "TEMPLATE_F1": os.path.join(BASE_DIR, "templates", "template_f1.pdf"),
    "TEMPLATE_F2": os.path.join(BASE_DIR, "templates", "template_f2.pdf"),
    "TEMPLATE_F3": os.path.join(BASE_DIR, "templates", "template_f3.pdf"),
    "TEMPLATE_TEMOIN": os.path.join(BASE_DIR, "templates", "template_temoin.pdf"),
    "TEMPLATE_COMPACTION": os.path.join(BASE_DIR, "templates", "template_compaction.pdf"),
    "TEMPLATE_PLANCHE": os.path.join(BASE_DIR, "templates", "template_planche.pdf"),
    "TAHOMA_FONT": os.path.join(BASE_DIR, "fonts", "tahoma.ttf") 
}

output_file = os.path.join(BASE_DIR, "pdf_templates.js")

with open(output_file, "w", encoding="utf-8") as f:
    f.write("// Fichier généré automatiquement contenant les PDFs et Polices en Base64\n\n")
    for var_name, path in files_to_convert.items():
        if os.path.exists(path):
            with open(path, "rb") as target_file:
                encoded_string = base64.b64encode(target_file.read()).decode('utf-8')
                f.write(f"const {var_name} = '{encoded_string}';\n\n")
            # Affiche seulement le nom du fichier pour que la console reste propre
            print(f"✅ {os.path.basename(path)} converti avec succès.")
        else:
            print(f"❌ Fichier introuvable : {path}")

print(f"\n🚀 Fichier pdf_templates.js généré avec succès dans le dossier : {BASE_DIR}")