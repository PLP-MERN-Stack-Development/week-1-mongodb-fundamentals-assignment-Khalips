const { MongoClient } = require('mongodb');

// Connection URI
const uri = 'mongodb+srv://khaliphilepapiyana7:ch%40rlMer1%24123@cluster0.oh3dllu.mongodb.net/';

async function runQueries() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const database = client.db("plp_bookstore");
    const collection = database.collection("books");

    // ===== BASIC CRUD OPERATIONS =====
    async function findBooksByGenre(genre) {
      try {
        console.log(`\n[1] Books in "${genre}" genre (title, author only):`);
        const books = await collection.find({ genre }, {
          projection: {
            _id: 0,
            title: 1,
            author: 1
          }
        }).toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error finding books by genre:", err);
      }
    }

    async function findBooksPublishedAfter(year) {
      try {
        console.log(`\n[2] Books published after ${year} (title, year, price):`);
        const books = await collection.find({ 
          published_year: { $gt: year } 
        }, {
          projection: {
            _id: 0,
            title: 1,
            published_year: 1,
            price: 1
          }
        }).toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error finding books by year:", err);
      }
    }

    async function findBooksByAuthor(author) {
      try {
        console.log(`\n[3] Books by "${author}" (title, genre, year):`);
        const books = await collection.find({ author }, {
          projection: {
            _id: 0,
            title: 1,
            genre: 1,
            published_year: 1
          }
        }).toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error finding books by author:", err);
      }
    }

    async function updateBookPrice(title, newPrice) {
      try {
        console.log(`\n[4] Updating "${title}" price to $${newPrice}`);
        const result = await collection.updateOne(
          { title },
          { $set: { price: newPrice } }
        );
        console.log(`→ Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
        
        const updatedBook = await collection.findOne(
          { title },
          { projection: { _id: 0, title: 1, price: 1 } }
        );
        console.log("Updated book:", updatedBook);
        return result;
      } catch (err) {
        console.error("Error updating book price:", err);
      }
    }

    async function deleteBookByTitle(title) {
      try {
        console.log(`\n[5] Deleting "${title}"`);
        const bookToDelete = await collection.findOne(
          { title },
          { projection: { _id: 0, title: 1, author: 1 } }
        );
        
        const result = await collection.deleteOne({ title });
        console.log(`→ Deleted ${result.deletedCount} book`);
        console.log("Deleted book was:", bookToDelete);
        return result;
      } catch (err) {
        console.error("Error deleting book:", err);
      }
    }

    // ===== ADVANCED QUERIES =====
    async function findInStockAfter2010() {
      try {
        console.log('\n[6] In-stock books published after 2010 (title, price, year):');
        const books = await collection.find({
          in_stock: true,
          published_year: { $gt: 2010 }
        }, {
          projection: {
            _id: 0,
            title: 1,
            price: 1,
            published_year: 1
          }
        }).toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error finding in-stock books:", err);
      }
    }

    async function sortBooksByPrice(direction = 'asc') {
      try {
        const sortOrder = direction === 'asc' ? 1 : -1;
        console.log(`\n[7] Books sorted by price (${direction}ending):`);
        const books = await collection.find({}, {
          projection: {
            _id: 0,
            title: 1,
            price: 1
          }
        })
        .sort({ price: sortOrder })
        .toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error sorting books:", err);
      }
    }

    async function paginateBooks(page = 1, pageSize = 5) {
      try {
        console.log(`\n[8] Page ${page} (${pageSize} books per page):`);
        const books = await collection.find({}, {
          projection: {
            _id: 0,
            title: 1,
            author: 1
          }
        })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
        console.table(books);
        return books;
      } catch (err) {
        console.error("Error paginating books:", err);
      }
    }

    // ===== AGGREGATION PIPELINES =====
    async function averagePriceByGenre() {
      try {
        console.log("\n[9] Average book price by genre:");
        const result = await collection.aggregate([
          {
            $group: {
              _id: "$genre",
              averagePrice: { $avg: "$price" },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              genre: "$_id",
              averagePrice: { $round: ["$averagePrice", 2] },
              count: 1
            }
          },
          { $sort: { averagePrice: -1 } }
        ]).toArray();
        console.table(result);
        return result;
      } catch (err) {
        console.error("Error calculating average price by genre:", err);
      }
    }

    async function authorWithMostBooks() {
      try {
        console.log("\n[10] Author with most books:");
        const result = await collection.aggregate([
          {
            $group: {
              _id: "$author",
              bookCount: { $sum: 1 }
            }
          },
          { $sort: { bookCount: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              author: "$_id",
              bookCount: 1
            }
          }
        ]).toArray();
        console.table(result);
        return result;
      } catch (err) {
        console.error("Error finding author with most books:", err);
      }
    }

    async function booksByDecade() {
      try {
        console.log("\n[11] Books grouped by publication decade:");
        const result = await collection.aggregate([
          {
            $addFields: {
              decade: {
                $subtract: [
                  "$published_year",
                  { $mod: ["$published_year", 10] }
                ]
              }
            }
          },
          {
            $group: {
              _id: "$decade",
              count: { $sum: 1 },
              books: { $push: "$title" }
            }
          },
          {
            $project: {
              _id: 0,
              decade: "$_id",
              count: 1,
              sampleBooks: { $slice: ["$books", 3] }
            }
          },
          { $sort: { decade: 1 } }
        ]).toArray();
        console.table(result);
        return result;
      } catch (err) {
        console.error("Error grouping books by decade:", err);
      }
    }

    // ===== INDEXING OPERATIONS =====
    async function createIndexes() {
      try {
        console.log("\n[12] Creating indexes...");
        
        // Create single index on title field
        const titleIndex = await collection.createIndex({ title: 1 });
        console.log(`→ Created index on title: ${titleIndex}`);
        
        // Create compound index on author and published_year
        const compoundIndex = await collection.createIndex({ author: 1, published_year: 1 });
        console.log(`→ Created compound index on author+year: ${compoundIndex}`);
        
        return { titleIndex, compoundIndex };
      } catch (err) {
        console.error("Error creating indexes:", err);
      }
    }

    async function demonstrateIndexPerformance() {
      try {
        console.log("\n[13] Demonstrating index performance:");
        
        // Without index (title search)
        console.log("\nQuery on title WITHOUT index:");
        let explain = await collection.find({ title: "1984" })
          .explain("executionStats");
        console.log(`→ Documents examined: ${explain.executionStats.totalDocsExamined}`);
        console.log(`→ Execution time: ${explain.executionStats.executionTimeMillis}ms`);
        
        // With index (title search)
        console.log("\nQuery on title WITH index:");
        explain = await collection.find({ title: "1984" })
          .explain("executionStats");
        console.log(`→ Index used: ${explain.executionStats.executionStages.inputStage.indexName}`);
        console.log(`→ Documents examined: ${explain.executionStats.totalDocsExamined}`);
        console.log(`→ Execution time: ${explain.executionStats.executionTimeMillis}ms`);
        
        // Compound index demonstration
        console.log("\nQuery using author+year compound index:");
        explain = await collection.find({ 
          author: "George Orwell", 
          published_year: { $gt: 1940 } 
        }).explain("executionStats");
        console.log(`→ Index used: ${explain.executionStats.executionStages.inputStage.indexName}`);
        console.log(`→ Documents examined: ${explain.executionStats.totalDocsExamined}`);
        console.log(`→ Execution time: ${explain.executionStats.executionTimeMillis}ms`);
        
        return explain;
      } catch (err) {
        console.error("Error demonstrating index performance:", err);
      }
    }

    // ===== EXECUTE ALL OPERATIONS =====
    console.log("=== BASIC CRUD OPERATIONS ===");
    await findBooksByGenre("Fantasy");
    await findBooksPublishedAfter(1950);
    await findBooksByAuthor("George Orwell");
    await updateBookPrice("1984", 14.99);
    await deleteBookByTitle("The Alchemist");

    console.log("\n=== ADVANCED QUERIES ===");
    await findInStockAfter2010();
    await sortBooksByPrice('asc');
    await sortBooksByPrice('desc');
    await paginateBooks(1);
    await paginateBooks(2);

    console.log("\n=== AGGREGATION PIPELINES ===");
    await averagePriceByGenre();
    await authorWithMostBooks();
    await booksByDecade();

    console.log("\n=== INDEXING OPERATIONS ===");
    await createIndexes();
    await demonstrateIndexPerformance();

  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    await client.close();
    console.log("\nConnection closed");
  }
}

runQueries();