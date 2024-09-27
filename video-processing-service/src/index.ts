import express from "express";
import { promisify } from "util";
import fs from "fs";

import { convertVideos, deleteProcessedVideo, deleteRawVideo, deleteVideo, downloadRawVideo, setUpDirectories, uploadProcessedVidoes } from "./storage";

setUpDirectories();
const app = express();
app.use(express.json());

const stat = promisify(fs.stat);

app.post("/process-video", async (req, res) => {
  
  // Get the name from pub sub from gsc
  let data;

  try {
    const message = Buffer.from(req.body.message.data, "base64").toString('utf8');
    data = JSON.parse(message);
    if(!data.name) {
      throw new Error("Invalid message payload recieved.");
      }
    } catch(err) {
      console.error(err);
      return res.status(400).send("Bad request: File name missing.")
  }

  const inputFileName = data.name;
  const outPutFileName = `processed-${data.name}`;

  await downloadRawVideo(inputFileName);

  // Convert the file resolution 
  try {
    await convertVideos(inputFileName, outPutFileName);
  } catch (error) {
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outPutFileName)
    ])
    return res.status(500).send('Processing failed');
  }


  // Upload the processsed file to the Cloud Storage 
  await uploadProcessedVidoes(outPutFileName);
  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outPutFileName)
  ]);

  return res.status(200).send('Processing finished successfully');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
