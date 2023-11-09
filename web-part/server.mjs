import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { parseFile, selectCover } from 'music-metadata';
import sharp from 'sharp';
import * as loudness from 'loudness';
const app = express();

app.use(express.static('public'));

let lastVolumeLevel = 0;


app.get('/songs', async (req, res) => {
  const playlistName = req.query.playlist;
  if (playlistName) {
    // If a playlist is selected, filter the songs to only include those in the selected playlist
    res.send(cachedSongs[playlistName]);
  } else {
    // If no playlist is selected, send all songs
    res.send(cachedSongs['all']);
  }
});



app.get('/currently-playing', (req, res) => {
  const readFile = () => {
    fs.readFile('C:\\Fachschaft\\music-player\\control-player\\currently-playing.txt', 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        // Retry after 2 seconds if there's an error
        setTimeout(readFile, 2000);
      } else {
        // Remove ".mp3 - Daum PotPlayer" from the string
        const title = data.replace('.mp3 - Daum PotPlayer', '');
        res.send(title);
      }
    });
  };

  readFile();
});


app.post('/create-playlist', express.json(), (req, res) => {
  const playlistName = req.body.name;
  const playlistPath = path.join('C:\\Users\\Drucker\\Music', playlistName);
  fs.mkdir(playlistPath, { recursive: true }, (err) => {
    if (err) {
      console.error(`Failed to create playlist: ${err.message}`);
      res.status(500).send('Failed to create playlist');
    } else {
      res.send('Playlist created');
      updateSongs();
    }
  });
});

app.get('/playlists', (req, res) => {
  fs.readdir('C:\\Users\\Drucker\\Music', (err, files) => {
    if (err) {
      console.error(`Failed to read playlists: ${err.message}`);
      res.status(500).send('Failed to read playlists');
    } else {
      const playlists = files.filter(file => fs.lstatSync(path.join('C:\\Users\\Drucker\\Music', file)).isDirectory());
      res.send(playlists);
    }
  });
});


app.post('/control', express.json(), (req, res) => {
  const action = req.body.action;
  if (action === 'set-volume') {
    const volume = req.body.volume;
    lastVolumeLevel = volume;
    loudness.setVolume(volume)
      .then(() => res.send('Volume set'))
      .catch(err => {
        console.error(`Failed to set volume: ${err.message}`);
        res.status(500).send('Failed to set volume');
      });
  } else if (action === 'download') {
  const link = req.body.link;
  const playlist = req.body.playlist;
  const downloadPath = path.join('C:\\Users\\Drucker\\Music', playlist || '', '%(title)s.%(ext)s');
  console.log(`Downloading song to: ${downloadPath}`);
  const command = `"C:\\Fachschaft\\music-player\\yt-dlp_full_pack\\yt-dlp.exe" -x --audio-format mp3 --add-metadata --embed-thumbnail --write-thumbnail --restrict-filenames --replace-in-metadata title "_" " " --audio-quality 0 -o "${downloadPath}" ${link}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Failed to execute command: ${error.message}`);
      res.status(500).send('Failed to execute command');
    } else {
      res.send('Command executed');
      setTimeout(() => updateSongs(playlist), 10000);  // Wait for 10 seconds before updating songs
    }
  });
  } else if (action === 'play') {
    const command = req.body.command;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to execute command: ${error.message}`);
        res.status(500).send('Failed to execute command');
      } else {
        res.send('Command executed');
      }
    });
  } else if (action === 'queue') {
      const command = req.body.command;
      fs.appendFile('C:\\Fachschaft\\music-player\\control-player\\queue.txt', `${command}\n`, err => {
        if (err) throw err;
      });
    }
   else {
    const commandPath = 'C:\\Fachschaft\\music-player\\control-player\\command';
    const commandFile = `${commandPath}\\${action}`;
    fs.writeFile(commandFile, '', (err) => {
      if (err) {
        console.error(`Failed to write command file: ${err.message}`);
        res.status(500).send('Failed to write command file');
      } else {
        res.send('Command file written');
      }
    });
  }
});

app.get('/volume', (req, res) => {
  // Send the last volume level
  res.send({ volume: lastVolumeLevel });
});


let cachedSongs = {};

async function updateSongs() {
  const baseDir = 'C:\\Users\\Drucker\\Music';
  const playlists = fs.readdirSync(baseDir).filter(file => fs.lstatSync(path.join(baseDir, file)).isDirectory());
  for (const playlist of playlists) {
    let songsDir = path.join(baseDir, playlist);
    const files = fs.readdirSync(songsDir).filter(file => path.extname(file) === '.mp3');
    const songPromises = files.map(async (file) => {
      try {
        const filePath = path.join(songsDir, file);
        const metadata = await parseFile(filePath);
        const cover = selectCover(metadata.common.picture);
        let coverBase64 = '';
        if (cover) {
          const compressedCover = await sharp(cover.data)
            .resize(200) // Resize to 200px width
            .jpeg({ quality: 80 }) // Compress the image with 80% quality
            .toBuffer();
          coverBase64 = `data:image/jpeg;base64,${compressedCover.toString('base64')}`;
        }
        return {
          title: metadata.common.title,
          artist: metadata.common.artist,
          album: metadata.common.album,
          cover: coverBase64,
          file: file
        };
      } catch (error) {
        console.error(`Failed to parse file ${file}: ${error.message}`);
        return null;
      }
    });
    const songs = await Promise.all(songPromises);
    cachedSongs[playlist] = songs.filter(song => song !== null);
  }
}


app.get('/queue', async (req, res) => {
  fs.readFile('C:\\Fachschaft\\music-player\\control-player\\queue.txt', 'utf8', async (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Failed to read queue');
    } else {
      const files = data.split('\n').filter(file => file !== '');
      const songPromises = files.map(async (file) => {
        try {
          const metadata = await parseFile(file);
          const cover = selectCover(metadata.common.picture);
          let coverBase64 = '';
          if (cover) {
            const compressedCover = await sharp(cover.data)
              .resize(200) // Resize to 200px width
              .jpeg({ quality: 80 }) // Compress the image with 80% quality
              .toBuffer();
            coverBase64 = `data:image/jpeg;base64,${compressedCover.toString('base64')}`;
          }
          return {
            title: metadata.common.title,
            cover: coverBase64,
          };
        } catch (error) {
          console.error(`Failed to parse file ${file}: ${error.message}`);
          return null;
        }
      });
      const songs = await Promise.all(songPromises);
      res.send(songs.filter(song => song !== null));
    }
  });
});



function deleteUnneededFiles() {
  const baseDir = 'C:\\Users\\Drucker\\Music';
  const playlists = fs.readdirSync(baseDir).filter(file => fs.lstatSync(path.join(baseDir, file)).isDirectory());
  for (const playlist of playlists) {
    let songsDir = path.join(baseDir, playlist);
    const files = fs.readdirSync(songsDir).filter(file => ['.webp', '.jpg'].includes(path.extname(file)));
    for (const file of files) {
      fs.unlink(path.join(songsDir, file), err => {
        if (err) {
          console.error(`Failed to delete file ${file}: ${err.message}`);
        }
      });
    }
  }
}


// Call the function to delete unneeded files every time the update function is called
setInterval(deleteUnneededFiles, 60 * 60 * 1000);

updateSongs();
setInterval(updateSongs, 10 * 60 * 1000);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

