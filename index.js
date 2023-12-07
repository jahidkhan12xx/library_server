const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 4000;


app.use(express.json())
app.use(cors({
  origin : [
    "http://localhost:5173",
    "https://dreamerslibrary-36210.web.app",
    "https://dreamerslibrary-36210.firebaseapp.com",
    
  ],
  credentials:true
}))
app.use(cookieParser())


const gateMan = (req,res,next) =>{
  const { token } = req.cookies;
  console.log(token);

  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }

  jwt.verify(token, process.env.TOKEN, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "forbidden" });
    }
    req.user = decoded;
    console.log(decoded);

    next();
  });

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xekxnzy.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const catCollection = client.db("DreamersLibrary").collection("Category");
    const bookCollection = client.db("DreamersLibrary").collection("Books");
    const borrowedBookCollection = client.db("DreamersLibrary").collection("BorrowedBooks");



    app.post("/api/v1/jwt", async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.TOKEN,{expiresIn: 60 * 60});
      res.cookie("token",token,{
        httpOnly:true,
        secure:true,
        sameSite:"none"
      }).send({message : "success"})
      
    })
    app.post('/api/v1/logout',(req,res)=>{
      const user = req.body;
      console.log("logging out user",user);
      res.clearCookie("token",{maxAge:0}).send({message :"true"})
      

    })



    app.get("/api/v1/bookCat", async (req,res)=>{
      const result = await catCollection.find().toArray();
      res.send(result);
    })
    app.get("/api/v1/books", async (req,res)=>{
      const result = await bookCollection.find().toArray();
      res.send(result);
    })

    app.patch("/api/v1/bookCount/:id", async(req,res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId (id) }

      const book = await bookCollection.findOne(query);
      console.log(book);
      if(book.productQuantity>0){
        const updateCount = {
          $set: {
            productQuantity : book.productQuantity-1,
          },
        }

        const result = await bookCollection.updateOne(query,updateCount)
        res.send(result)

      }
      else{
        res.send({modified : false})
      }
      
      
    })

    app.post("/api/v1/addBorrowBooks", async(req,res)=>{
      const data = req.body;
      const result = await borrowedBookCollection.insertOne(data);
      res.send(result);
    })

    app.get("/api/v1/borrowBooks", gateMan,async(req,res)=>{
      const email = req.query.email;
      console.log(req.user);
      console.log(email);
      const result = await borrowedBookCollection.find({email : email}).toArray();
      res.send(result)
      
    })
    app.get("/api/v1/borrowedBooks",gateMan,async(req,res)=>{
      const email = req.query.email;
      // console.log(req.user.email);
      if(email === req.user.email){
        console.log(email);
      const result = await borrowedBookCollection.find({email : email}).toArray();
      res.send(result)
      }
      else{
        res.status(401).send({message : "unauthorized"})
      }
      
      
    })

    app.delete("/api/v1/deleteBorrowBooks/:id",async(req,res)=>{
      const id = req.params.id;
      const result = await borrowedBookCollection.deleteOne({_id : new ObjectId (id)})
      res.send(result)
    } )

    app.patch("/api/v1/increaseCount/:name", async(req,res)=>{
      const bookName = req.params.name;
      
      const query = {productName : bookName};
      const book = await bookCollection.findOne(query)
      
      if(book){
        const updatedDoc = {
          $set: {
            productQuantity : book.productQuantity+1
          }
        }

        const result = await bookCollection.updateOne(query,updatedDoc)
        res.send(result)
      }

      
    })


    app.get("/api/v1/books/:id" ,  async(req,res)=>{
      const id = req.params.id;
      const query = {
        "catCode": id
      }

      const result = await bookCollection.find(query).toArray();
      res.send(result)
    })

    app.put("/api/v1/books/:id", async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const query = {
        _id : new ObjectId (id)
      }

      const updatedDoc = {
        $set : {

          productImg : data.productImg,
          productName : data.productName,
          productQuantity : data.productQuantity,
          productDes : data.productDes,
          authorName : data.authorName,
          catCode : data.catCode,
          rating : data.rating

        }
      }

      const result  = await bookCollection.updateOne(query,updatedDoc);
      res.send(result);
      console.log(result,data);

    })


    app.get("/api/v1/specificBook/:id",async(req,res)=>{

    const id = req.params.id;
    console.log(
      id
    );
    const query = {_id : new ObjectId (id)}

    const result = await bookCollection.findOne(query);
    res.send(result)
    console.log(result);
    })



    app.get("/api/v1/specificBook/:id" ,  async(req,res)=>{
      const id = req.params.id;
      const query = {
        "_id": new ObjectId (id)
      }

      const result = await bookCollection.findOne(query)
      res.send(result)
    })


    app.post("/api/v1/books", async(req,res)=>{
      const data = req.body;
      const result = await bookCollection.insertOne(data);
      res.send(result);
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
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})