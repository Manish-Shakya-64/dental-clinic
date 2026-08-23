import { Schema, Document } from "mongoose";
import { encryptField, decryptField } from "./encryption.js";
import { blindIndex } from "./blindIndex.js";

interface SubdocumentLike {
  isModified(path: string): boolean;
  get(path: string): unknown;
  set(path: string, value: unknown): void;
}

export interface ArrayFieldSpec {
  /** Top-level array path, e.g. "medicines". */
  path: string;
  /** Fields on each subdocument to encrypt, e.g. ["name", "dosage", "instructions"]. */
  fields: string[];
}

export interface FieldEncryptionOptions {
  /** Top-level or dot-path fields to encrypt, e.g. "clinical_note.note_text". */
  fields: string[];
  /** Subset of `fields` (top-level only) that also get a `<field>_hash` blind-index companion. */
  blindIndexFields?: string[];
  /** Array-of-subdocuments fields whose per-element string fields should be encrypted. */
  arrayFields?: ArrayFieldSpec[];
}

type EncryptableDocument = Document;

interface ArrayEntryRef {
  path: string;
  index: number;
  field: string;
}

/**
 * Transparent field-level AES-256-GCM encryption for Mongoose schemas.
 *
 * Application code always sees plaintext: pre('validate') encrypts modified fields in place —
 * before writing, and before Mongoose's own `required` checks run, since those checks run ahead of
 * pre('save') hooks and would otherwise reject an unset `<field>_hash` — post('save') decrypts them
 * back to plaintext in memory, and post('init') decrypts every document hydrated from a query.
 * `.lean()` bypasses `init` and MUST NOT be used on models carrying this plugin, since it would
 * return raw ciphertext.
 */
export function fieldEncryptionPlugin(schema: Schema, options: FieldEncryptionOptions): void {
  const { fields, blindIndexFields = [], arrayFields = [] } = options;

  schema.pre("validate", function (this: EncryptableDocument, next) {
    const encryptedFields: string[] = [];

    for (const field of fields) {
      if (!this.isModified(field)) continue;

      const value = this.get(field);
      if (typeof value !== "string" || value.length === 0) continue;

      if (blindIndexFields.includes(field)) {
        this.set(`${field}_hash`, blindIndex(value));
      }

      this.set(field, encryptField(value));
      encryptedFields.push(field);
    }

    const encryptedArrayEntries: ArrayEntryRef[] = [];

    for (const spec of arrayFields) {
      const arr = (this.get(spec.path) as SubdocumentLike[] | undefined) ?? [];
      for (let index = 0; index < arr.length; index++) {
        const subdoc = arr[index];
        for (const field of spec.fields) {
          if (!subdoc.isModified(field)) continue;

          const value = subdoc.get(field);
          if (typeof value !== "string" || value.length === 0) continue;

          subdoc.set(field, encryptField(value));
          encryptedArrayEntries.push({ path: spec.path, index, field });
        }
      }
    }

    this.$locals.__encryptedFields = encryptedFields;
    this.$locals.__encryptedArrayEntries = encryptedArrayEntries;
    next();
  });

  schema.post("save", function (this: EncryptableDocument) {
    const encryptedFields = (this.$locals.__encryptedFields as string[] | undefined) ?? [];
    for (const field of encryptedFields) {
      const value = this.get(field);
      if (typeof value === "string" && value.length > 0) {
        this.set(field, decryptField(value));
      }
    }

    const encryptedArrayEntries =
      (this.$locals.__encryptedArrayEntries as ArrayEntryRef[] | undefined) ?? [];
    for (const entry of encryptedArrayEntries) {
      const arr = this.get(entry.path) as SubdocumentLike[] | undefined;
      const subdoc = arr?.[entry.index];
      if (!subdoc) continue;

      const value = subdoc.get(entry.field);
      if (typeof value === "string" && value.length > 0) {
        subdoc.set(entry.field, decryptField(value));
      }
    }

    delete this.$locals.__encryptedFields;
    delete this.$locals.__encryptedArrayEntries;
  });

  schema.post("init", function (this: EncryptableDocument) {
    for (const field of fields) {
      const value = this.get(field);
      if (typeof value === "string" && value.length > 0) {
        this.set(field, decryptField(value));
      }
    }

    for (const spec of arrayFields) {
      const arr = (this.get(spec.path) as SubdocumentLike[] | undefined) ?? [];
      for (const subdoc of arr) {
        for (const field of spec.fields) {
          const value = subdoc.get(field);
          if (typeof value === "string" && value.length > 0) {
            subdoc.set(field, decryptField(value));
          }
        }
      }
    }
  });
}
