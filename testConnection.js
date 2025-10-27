const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://queentouchtech_db_user:OjiFI9sLNT05fWxS@whatsapp-api.igqb27o.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully!");
    const dbList = await client.db().admin().listDatabases();
    console.log("📚 Databases:", dbList.databases.map(db => db.name));
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await client.close();
  }
}

testConnection();
