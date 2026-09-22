import mongoose from "mongoose";

const MONGO_URI =
"mongodb+srv://lifeline360_admin:lifeline360@cluster0.vznlzvm.mongodb.net/?appName=Cluster0";

async function testConnection() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ Successfully Connected to MongoDB Atlas");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    await mongoose.disconnect();
    console.log("✅ Connection Closed");
  } catch (err) {
    console.log("❌ Connection Failed");
    console.error(err);
  }
}

testConnection();