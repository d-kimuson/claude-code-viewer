/**
 * File utilities for file upload and encoding
 */

export type FileType = "text" | "image" | "pdf";

export type ImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    data: string;
  };
};

export type DocumentBlock = {
  type: "document";
  source: {
    type: "base64";
    media_type: "application/pdf";
    data: string;
  };
};

/**
 * Determine file type based on MIME type
 */
export const determineFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  return "text";
};

/**
 * Check if MIME type is supported
 */
export const isSupportedMimeType = (mimeType: string): boolean => {
  const supportedImageTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];
  const supportedDocumentTypes = ["application/pdf"];
  const supportedTextTypes = ["text/plain"];

  return (
    supportedImageTypes.includes(mimeType) ||
    supportedDocumentTypes.includes(mimeType) ||
    supportedTextTypes.includes(mimeType)
  );
};

/**
 * Convert File to base64 encoded string (without data URL prefix)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(",")[1];
        resolve(base64 ?? "");
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Convert File to plain text
 */
export const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
};

/**
 * Process a file and return appropriate block structure
 */
export const processFile = async (
  file: File,
): Promise<
  | { type: "text"; content: string }
  | { type: "image"; block: ImageBlock }
  | { type: "document"; block: DocumentBlock }
> => {
  const fileType = determineFileType(file.type);

  if (fileType === "text") {
    const content = await fileToText(file);
    return { type: "text", content };
  }

  const base64Data = await fileToBase64(file);

  if (fileType === "image") {
    const mediaType = file.type as ImageBlock["source"]["media_type"];
    return {
      type: "image",
      block: {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      },
    };
  }

  // PDF
  return {
    type: "document",
    block: {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64Data,
      },
    },
  };
};
