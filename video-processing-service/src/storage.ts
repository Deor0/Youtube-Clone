import { Storage } from "@google-cloud/storage";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

const storage = new Storage();

const rawBucketName = "demo-raw-video";
const processsedBucketName = "demo-processed-video";

const localRawDirectory = "./raw-videos";
const localProcessedDirectory = "./processed-videos";

// Creates directories for raw and processed videos
export function setUpDirectories() {
  ensureDirectoryExistence(localRawDirectory);
  ensureDirectoryExistence(localProcessedDirectory);
}

/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */
export function convertVideos(
  rawVideoName: string,
  processedVideoName: string
) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawDirectory}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360") // 360p
      .on("end", () => {
        console.log("Processing finished successfully");
        resolve();
        //   res.status(200).send("Processing finished successfully");
      })
      .on("error", (err) => {
        console.log("An error occurred: " + err.message);
        reject();
        //   res.status(500).send("An error occurred: " + err.message);
      })
      .save(`${localProcessedDirectory}/${processedVideoName}`);
  });
}

/**
 *
 * @param fileName - The name of the file to download from
 * {@link rawBucketName} to {@link localRawDirectory}
 * @returns a promise which is resolved when the file is downloaded
 */
export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawBucketName)
    .file(fileName)
    .download({ destination: `${localRawDirectory}/${fileName}` });

  console.log(
    `gs://${rawBucketName}/${fileName} downloaded to ${localRawDirectory}/${fileName}`
  );
}

/**
 *
 * @param fileName - The name of the file to upload from
 * {@link localProcessedDirectory} to {@link processsedBucketName}
 * @returns a promise which is resolved when file is uploaded
 */
export async function uploadProcessedVidoes(fileName: string) {
  const bucket = storage.bucket(processsedBucketName);

  await bucket.upload(`${localProcessedDirectory}/${fileName}`, {
    destination: fileName,
  });
  console.log(
    `gs://${localProcessedDirectory}/${fileName} uploaded to ${processsedBucketName}/${fileName}`
  );

  await bucket.file(fileName).makePublic();
}

/**
 *
 * @param filePath - the path of the file needed to be deleted
 * @returns a promise which is resolved when the video is deleted
 */
export function deleteVideo(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (error) => {
        if (error) {
          console.error(`Failed to delete file at ${filePath}`, error);
          reject(error);
        } else {
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      console.log(`File not found at ${filePath}`);
      reject();
    }
  });
}

/**
 * @param fileName - The name of the file to delete from the
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 *
 */
export function deleteRawVideo(fileName: string) {
  return deleteVideo(`${localRawDirectory}/${fileName}`);
}

/**
 * @param fileName - The name of the file to delete from the
 * {@link localProcessedVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 *
 */
export function deleteProcessedVideo(fileName: string) {
  return deleteVideo(`${localProcessedDirectory}/${fileName}`);
}

/**
 *
 * @param dirPath - The directory of the file
 * Checks if the file exist or not in the specific parameter provided if not make found makes a directory
 */
export function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`File created at ${dirPath}`);
  }
}
