const express = require('express');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;



// middlewere
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://job-portal-28d30.web.app',
    'https://job-portal-28d30.firebaseapp.com',
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ massage: 'unauthoraige accses' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: 'unauthorage acces' });
    }
    req.user = decoded,
      next();
  })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tkyyb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobs_collection = client.db('Jobs').collection('jobs_collection');
    const job_applicationCollection = client.db('Jobs').collection('job_applications');


    // auth releted  api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true })
    })

    // for remove token after logout
    app.post('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true })
    })

    app.get('/jobs', async (req, res) => {
      const cursor = jobs_collection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    // get job by id
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobs_collection.findOne(query);
      res.send(result);
    })

    // job application api
    app.post('/job-applications', async (req, res) => {
      const quiry = req.body;
      const result = await job_applicationCollection.insertOne(quiry);
      res.send(result);
    })
    app.get('/job-applications', async (req, res) => {
      const result = await job_applicationCollection.find().toArray();
      res.send(result);
    })

    // job applicant api by email
    app.get('/job-application', verifyToken, async (req, res) => {
      const email = req.query.email;
      const quiry = { applicant_email: email };

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ massage: 'forbidden access' })
      }


      const result = await job_applicationCollection.find(quiry).toArray();

      // // fokira way 
      for (const aplication of result) {
        console.log(aplication.job_id);
      }
      res.send(result);
      console.log(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('the server is running....')
})

app.listen(port, () => {
  console.log('the server is running on port: ', port);
})