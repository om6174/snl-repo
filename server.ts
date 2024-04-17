import express, { urlencoded } from 'express';
import trainerRoutes from './src/components/trainer';
import userRoutes from './src/components/user';
import variationRoutes from './src/components/variation';
import gameplayRoutes from './src/components/gameplay';
import { upload } from './src/middleware';
import path from 'path';
import { setupSocket} from './src/config/socket';

require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

const httpServer = setupSocket(app);

// Middleware to parse JSON requests
app.use(express.json());
app.use(urlencoded({extended: true}));

// Use the trainer routes under the '/api/trainers' path
app.use('/api/trainer', trainerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/variation', variationRoutes);
app.use('/api/gameplay', gameplayRoutes);


app.post("/upload/:fileType", upload.single("file"), (req, res) => {
  console.log(req.file)
  return res.send(req.file?.path)
});

app.get("/download/:filePath", (req, res) => {
  // Extract the file path from the request parameter
  const filePath = req.params.filePath;

  // Define the full path to the file on the server
  const fullFilePath = path.join(__dirname, filePath);

  // Send the file as a response using res.sendFile()
  res.sendFile(fullFilePath, (err) => {
      if (err) {
          // Handle any errors that occur during file sending
          console.error(`Error sending file: ${err}`);
          res.status(404).send('File not found');
      }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
