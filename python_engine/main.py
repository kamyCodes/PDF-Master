import argparse
import sys
import json
import os
import shutil
import subprocess
import fitz  # PyMuPDF

# ─────────────────────────────────────────────────────────────
# PAGE OPERATIONS
# ─────────────────────────────────────────────────────────────

def split_pdf(input_path, output_dir):
    try:
        doc = fitz.open(input_path)
        num_pages = len(doc)
        base = os.path.splitext(os.path.basename(input_path))[0]
        
        # Create a new subfolder named after the PDF file
        pdf_folder = os.path.join(output_dir, base)
        os.makedirs(pdf_folder, exist_ok=True)
        
        for i in range(num_pages):
            out_doc = fitz.open()
            out_doc.insert_pdf(doc, from_page=i, to_page=i)
            out_path = os.path.join(pdf_folder, f"{base}_page_{i+1}.pdf")
            out_doc.save(out_path)
            out_doc.close()
        doc.close()
        return {"status": "success", "message": f"Split into {num_pages} pages in folder: {pdf_folder}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def merge_pdfs(input_paths, output_path):
    try:
        out_doc = fitz.open()
        for path in input_paths:
            doc = fitz.open(path)
            out_doc.insert_pdf(doc)
            doc.close()
        out_doc.save(output_path)
        out_doc.close()
        return {"status": "success", "message": f"Merged {len(input_paths)} files → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def rotate_pages(input_path, output_path, degrees, page_nums=None):
    """Rotate all pages or specific pages (0-indexed list)."""
    try:
        doc = fitz.open(input_path)
        degrees = int(degrees)
        for i, page in enumerate(doc):
            if page_nums is None or i in page_nums:
                page.set_rotation((page.rotation + degrees) % 360)
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Rotated {degrees}° → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def delete_pages(input_path, output_path, page_nums):
    """Delete specific pages (0-indexed list)."""
    try:
        doc = fitz.open(input_path)
        # delete in reverse order so indices don't shift
        for i in sorted(page_nums, reverse=True):
            doc.delete_page(i)
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Deleted {len(page_nums)} page(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def extract_pages(input_path, output_path, page_nums):
    """Extract specific pages into a new PDF (0-indexed)."""
    try:
        doc = fitz.open(input_path)
        out_doc = fitz.open()
        for i in sorted(page_nums):
            out_doc.insert_pdf(doc, from_page=i, to_page=i)
        out_doc.save(output_path)
        out_doc.close()
        doc.close()
        return {"status": "success", "message": f"Extracted {len(page_nums)} page(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def insert_blank_page(input_path, output_path, page_num):
    try:
        doc = fitz.open(input_path)
        doc.insert_page(int(page_num), text=" ")
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Blank page inserted at index {page_num}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def insert_file(input_path, output_path, insert_path, page_num):
    try:
        doc = fitz.open(input_path)
        other_doc = fitz.open(insert_path)
        doc.insert_pdf(other_doc, start_at=int(page_num))
        doc.save(output_path)
        other_doc.close()
        doc.close()
        return {"status": "success", "message": f"File inserted at index {page_num}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def duplicate_page(input_path, output_path, page_num):
    try:
        doc = fitz.open(input_path)
        page_num = int(page_num)
        doc.fullcopy_page(page_num, insert_at=page_num + 1)
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Page {page_num+1} duplicated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# CONVERSION & OCR
# ─────────────────────────────────────────────────────────────

def convert_images(image_paths, output_path):
    try:
        doc = fitz.open()
        for img_path in image_paths:
            img = fitz.open(img_path)
            pdfbytes = img.convert_to_pdf()
            img.close()
            imgPDF = fitz.open("pdf", pdfbytes)
            doc.insert_pdf(imgPDF)
            imgPDF.close()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Images converted to {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def convert_office(input_path, output_dir):
    try:
        # Calls local LibreOffice installation on Windows (must be in PATH)
        cmd = ['soffice', '--headless', '--convert-to', 'pdf', '--outdir', output_dir, input_path]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        base_name = os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
        final_pdf_path = os.path.join(output_dir, base_name)
        if os.path.exists(final_pdf_path):
            return {"status": "success", "message": "Office document converted.", "output_path": final_pdf_path}
        else:
            return {"status": "error", "message": "LibreOffice conversion completed but PDF not found."}
    except FileNotFoundError:
        return {"status": "error", "message": "LibreOffice ('soffice') not found in PATH."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def ocr_searchable(input_path, output_path):
    try:
        # Requires PyMuPDF built with Tesseract support and Tesseract installed
        doc = fitz.open(input_path)
        for page in doc:
            # Replaces the page with an OCR text overlay
            page.get_textpage_ocr(flags=0, language='eng')
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": "Document is now searchable"}
    except Exception as e:
        return {"status": "error", "message": "OCR failed. Ensure Tesseract is installed. " + str(e)}

# ─────────────────────────────────────────────────────────────
# TEXT OPERATIONS
# ─────────────────────────────────────────────────────────────

def replace_text(input_path, output_path, old_text, new_text):
    try:
        doc = fitz.open(input_path)
        count = 0
        for page in doc:
            instances = page.search_for(old_text)
            count += len(instances)
            for inst in instances:
                page.add_redact_annot(inst, text=new_text, fontname="helv", fontsize=11,
                                      text_color=(0, 0, 0), fill=(1, 1, 1))
            page.apply_redactions()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Replaced {count} instance(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_text(input_path, output_path, page_num, text, x, y, fontsize, color_hex):
    """Add text at given position on a page (0-indexed page_num)."""
    try:
        doc = fitz.open(input_path)
        page = doc[int(page_num)]
        # parse hex color to rgb 0-1 tuple
        color_hex = color_hex.lstrip('#')
        r, g, b = (int(color_hex[i:i+2], 16) / 255 for i in (0, 2, 4))
        page.insert_text(fitz.Point(float(x), float(y)), text,
                         fontname="helv", fontsize=float(fontsize), color=(r, g, b))
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Text added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def delete_text(input_path, output_path, search_text):
    """Delete/redact text by covering it with a white box."""
    try:
        doc = fitz.open(input_path)
        count = 0
        for page in doc:
            instances = page.search_for(search_text)
            count += len(instances)
            for inst in instances:
                page.add_redact_annot(inst, fill=(1, 1, 1))
            page.apply_redactions()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Deleted {count} instance(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# ANNOTATIONS
# ─────────────────────────────────────────────────────────────

def highlight_text(input_path, output_path, search_text):
    try:
        doc = fitz.open(input_path)
        count = 0
        for page in doc:
            instances = page.search_for(search_text)
            count += len(instances)
            for inst in instances:
                annot = page.add_highlight_annot(inst)
                annot.update()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Highlighted {count} instance(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def underline_text(input_path, output_path, search_text):
    try:
        doc = fitz.open(input_path)
        count = 0
        for page in doc:
            instances = page.search_for(search_text)
            count += len(instances)
            for inst in instances:
                annot = page.add_underline_annot(inst)
                annot.update()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Underlined {count} instance(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def strikethrough_text(input_path, output_path, search_text):
    try:
        doc = fitz.open(input_path)
        count = 0
        for page in doc:
            instances = page.search_for(search_text)
            count += len(instances)
            for inst in instances:
                annot = page.add_strikeout_annot(inst)
                annot.update()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Strikethrough {count} instance(s) → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_sticky_note(input_path, output_path, page_num, note_text, x, y):
    try:
        doc = fitz.open(input_path)
        page = doc[int(page_num)]
        annot = page.add_text_annot(fitz.Point(float(x), float(y)), note_text)
        annot.update()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Sticky note added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# IMAGES
# ─────────────────────────────────────────────────────────────

def add_image(input_path, output_path, page_num, image_path, x, y, width, height):
    try:
        doc = fitz.open(input_path)
        page = doc[int(page_num)]
        rect = fitz.Rect(float(x), float(y), float(x) + float(width), float(y) + float(height))
        page.insert_image(rect, filename=image_path)
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Image added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# APPEARANCE
# ─────────────────────────────────────────────────────────────

def add_watermark(input_path, output_path, watermark_text, opacity=0.3):
    try:
        doc = fitz.open(input_path)
        for page in doc:
            rect = page.rect
            # Insert watermark text diagonally across the page
            page.insert_text(
                fitz.Point(rect.width * 0.1, rect.height * 0.55),
                watermark_text,
                fontsize=60,
                color=(0.7, 0.7, 0.7),
                rotate=45,
                overlay=False  # draw behind content
            )
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Watermark added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_page_numbers(input_path, output_path, position="bottom-center", start=1):
    try:
        doc = fitz.open(input_path)
        for i, page in enumerate(doc):
            rect = page.rect
            num = i + int(start)
            if position == "bottom-center":
                pt = fitz.Point(rect.width / 2 - 10, rect.height - 20)
            elif position == "bottom-right":
                pt = fitz.Point(rect.width - 50, rect.height - 20)
            else:
                pt = fitz.Point(20, rect.height - 20)
            page.insert_text(pt, str(num), fontsize=10, color=(0, 0, 0))
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Page numbers added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def compress_pdf(input_path, output_path):
    try:
        doc = fitz.open(input_path)
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()
        orig_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        saved_kb = (orig_size - new_size) // 1024
        return {"status": "success", "message": f"Compressed! Saved ~{saved_kb} KB → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_header_footer(input_path, output_path, header_text, footer_text):
    try:
        doc = fitz.open(input_path)
        for page in doc:
            rect = page.rect
            if header_text:
                page.insert_text(fitz.Point(rect.width / 2 - len(header_text) * 3, 20),
                                 header_text, fontsize=10, color=(0, 0, 0))
            if footer_text:
                page.insert_text(fitz.Point(rect.width / 2 - len(footer_text) * 3, rect.height - 15),
                                 footer_text, fontsize=10, color=(0, 0, 0))
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Header/Footer added → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# SECURITY
# ─────────────────────────────────────────────────────────────

def encrypt_pdf(input_path, output_path, user_pw, owner_pw=None):
    try:
        doc = fitz.open(input_path)
        perm = fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY
        doc.save(output_path, encryption=fitz.PDF_ENCRYPT_AES_256,
                 user_pw=user_pw, owner_pw=owner_pw or user_pw, permissions=perm)
        doc.close()
        return {"status": "success", "message": f"Encrypted → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def remove_password(input_path, output_path, password):
    try:
        doc = fitz.open(input_path)
        if doc.is_encrypted:
            result = doc.authenticate(password)
            if not result:
                return {"status": "error", "message": "Wrong password."}
        doc.save(output_path, encryption=fitz.PDF_ENCRYPT_NONE)
        doc.close()
        return {"status": "success", "message": f"Password removed → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# METADATA
# ─────────────────────────────────────────────────────────────

def get_metadata(input_path):
    try:
        doc = fitz.open(input_path)
        meta = doc.metadata
        doc.close()
        return {"status": "success", "metadata": meta}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def set_metadata(input_path, output_path, title="", author="", subject="", keywords=""):
    try:
        doc = fitz.open(input_path)
        meta = doc.metadata
        if title:    meta["title"]    = title
        if author:   meta["author"]   = author
        if subject:  meta["subject"]  = subject
        if keywords: meta["keywords"] = keywords
        doc.set_metadata(meta)
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Metadata updated → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# SAVE / COPY
# ─────────────────────────────────────────────────────────────

def save_pdf(input_path, output_path):
    try:
        shutil.copy2(input_path, output_path)
        return {"status": "success", "message": f"Saved → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def create_blank_pdf(output_path):
    """Create a new blank single-page PDF at the given path."""
    try:
        doc = fitz.open()
        doc.new_page()
        doc.save(output_path)
        doc.close()
        return {"status": "success", "message": f"Blank PDF created → {output_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─────────────────────────────────────────────────────────────
# DISPATCH TABLE
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PDF Master Engine")
    parser.add_argument("action", help="Action to perform")
    parser.add_argument("--input",    nargs="+")
    parser.add_argument("--output")
    parser.add_argument("--text")
    parser.add_argument("--new_text")
    parser.add_argument("--page",     type=int, default=0)
    parser.add_argument("--pages",    help="Comma-separated 0-indexed page numbers")
    parser.add_argument("--degrees",  type=int, default=90)
    parser.add_argument("--x",        type=float, default=50)
    parser.add_argument("--y",        type=float, default=50)
    parser.add_argument("--w",        type=float, default=200)
    parser.add_argument("--h",        type=float, default=200)
    parser.add_argument("--fontsize", type=float, default=12)
    parser.add_argument("--color",    default="000000")
    parser.add_argument("--opacity",  type=float, default=0.3)
    parser.add_argument("--position", default="bottom-center")
    parser.add_argument("--start",    type=int, default=1)
    parser.add_argument("--password")
    parser.add_argument("--owner_pw")
    parser.add_argument("--header",   default="")
    parser.add_argument("--footer",   default="")
    parser.add_argument("--title",    default="")
    parser.add_argument("--author",   default="")
    parser.add_argument("--subject",  default="")
    parser.add_argument("--keywords", default="")
    parser.add_argument("--image")

    args = parser.parse_args()

    page_nums = None
    if args.pages:
        page_nums = [int(p.strip()) for p in args.pages.split(",") if p.strip()]

    result = {"status": "error", "message": "Unknown action"}

    try:
        inp = args.input[0] if args.input else None
        out = args.output

        if   args.action == "split":         result = split_pdf(inp, out)
        elif args.action == "merge":         result = merge_pdfs(args.input, out)
        elif args.action == "rotate":        result = rotate_pages(inp, out, args.degrees, page_nums)
        elif args.action == "delete_pages":  result = delete_pages(inp, out, page_nums)
        elif args.action == "extract_pages": result = extract_pages(inp, out, page_nums)
        elif args.action == "replace":       result = replace_text(inp, out, args.text, args.new_text)
        elif args.action == "add_text":      result = add_text(inp, out, args.page, args.text, args.x, args.y, args.fontsize, args.color)
        elif args.action == "delete_text":   result = delete_text(inp, out, args.text)
        elif args.action == "highlight":     result = highlight_text(inp, out, args.text)
        elif args.action == "underline":     result = underline_text(inp, out, args.text)
        elif args.action == "strikethrough": result = strikethrough_text(inp, out, args.text)
        elif args.action == "sticky_note":   result = add_sticky_note(inp, out, args.page, args.text, args.x, args.y)
        elif args.action == "add_image":     result = add_image(inp, out, args.page, args.image, args.x, args.y, args.w, args.h)
        elif args.action == "watermark":     result = add_watermark(inp, out, args.text, args.opacity)
        elif args.action == "page_numbers":  result = add_page_numbers(inp, out, args.position, args.start)
        elif args.action == "compress":      result = compress_pdf(inp, out)
        elif args.action == "header_footer": result = add_header_footer(inp, out, args.header, args.footer)
        elif args.action == "encrypt":       result = encrypt_pdf(inp, out, args.password, args.owner_pw)
        elif args.action == "remove_pw":     result = remove_password(inp, out, args.password)
        elif args.action == "get_metadata":  result = get_metadata(inp)
        elif args.action == "set_metadata":  result = set_metadata(inp, out, args.title, args.author, args.subject, args.keywords)
        elif args.action == "save":          result = save_pdf(inp, out)
        elif args.action == "create_blank":  result = create_blank_pdf(out)
        elif args.action == "insert_blank":  result = insert_blank_page(inp, out, args.page)
        elif args.action == "insert_file":   result = insert_file(inp, out, args.image, args.page) # args.image reused for file path
        elif args.action == "duplicate_page":result = duplicate_page(inp, out, args.page)
        elif args.action == "convert_images":result = convert_images(args.input, out)
        elif args.action == "convert_office":result = convert_office(inp, out)
        elif args.action == "ocr_searchable":result = ocr_searchable(inp, out)
        else:
            result = {"status": "error", "message": f"Unknown action: {args.action}"}
    except Exception as e:
        result = {"status": "error", "message": str(e)}

    print(json.dumps(result))
