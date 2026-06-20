import api from "./api";

export const getClipboardImages = (clipboardData) =>
  Array.from(clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

export const uploadChatImage = async (image) => {
  const formData = new FormData();
  formData.append("image", image);

  const response = await api.post("/chat/images", formData);
  return response.data;
};
