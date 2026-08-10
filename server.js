require("dotenv").config();
require("./config/redis");


const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5500;

pool.connect()
.then(()=>{
    console.log("postgreSQL Connected");

      app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

})

.catch((err) => {
  console.log("databse connection failed");

  console.log(err.message);
});
