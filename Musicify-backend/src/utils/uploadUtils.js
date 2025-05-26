import { v2 as cloudinary } from 'cloudinary';

export const uploadAudioFile = async (audioFile) => {
    const audioUpload = await cloudinary.uploader.upload(audioFile.path, {
        resource_type: "video"
    });
    const duration = `${Math.floor(audioUpload.duration/60)}:${Math.floor(audioUpload.duration%60)}`;
    return {
        fileUrl: audioUpload.secure_url,
        duration
    };
};

export const uploadImageFile = async (imageFile) => {
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image"
    });
    return imageUpload.secure_url;
};

export const uploadLrcFile = async (lrcFile) => {
    try {
        const lrcUpload = await cloudinary.uploader.upload(lrcFile.path, {
            resource_type: "raw",
            format: "txt"
        });
        return lrcUpload.secure_url;
    } catch (error) {
        console.error("Failed to upload LRC file:", error.message);
        return "";
    }
};