const jwt = require("jsonwebtoken");
const BlogModel = require("../models/blogModel")
const AuthorModel = require("../models/authorModel")
const ObjectId = require('mongoose').Types.ObjectId

const loginUser = async function (req, res) {
  try {
    let userName = req.body.email;
    let password = req.body.password;
    if (!userName || !password)
      return res.status(401).send({ status: false, msg: "Username or the password is not entered" });

    let author = await AuthorModel.findOne({ email: userName, password: password });
    if (!author)
      return res.status(400).send({ status: false, msg: "Username or the password is not corerct" });

    let token = jwt.sign({ authorId: author._id.toString(), }, "room 37");
    res.status(201).send({ status: true, data: token });
  } catch (error) {
    res.status(500).send({ status: false, msg: error.message })
  }
}


const createBlog = async function (req, res) {
  try {
    let blog = req.body
    if (Object.keys(blog).length == 0) {
      return res.status(400).send({ status: false, msg: "No data to create a blog" })
    }
    let author_id = blog.authorId
    if (!author_id) {
      return res.status(400).send({ status: false, msg: "Author Id should be present in the blog data" })
    }
    if (!ObjectId.isValid(author_id)) {
      return res.status(404).send({ status: false, msg: "AuthorId invalid" });
    }
    let validAuthor = await AuthorModel.findById(author_id)
    if (!validAuthor) {
      return res.status(404).send({ status: false, msg: "Author data not found" });
    }
    let token = req.headers["x-api-key"]
    let decodedToken = jwt.verify(token, "room 37");
    let authorLoggedIn = decodedToken.authorId
    if (authorLoggedIn != author_id) {
      return res.status(403).send({ status: false, msg: "Author logged in cannot create blog with another author's Id" })
    }
    let is_published = blog.isPublished
    if (is_published == true) {
      blog.publishedAt = new Date()
      let blogCreated = await BlogModel.create(blog)
      return res.status(201).send({ status: true, data: blogCreated })
    }
    let blogCreated = await BlogModel.create(blog)
    return res.status(201).send({ status: true, data: blogCreated })
  } catch (error) {
    return res.status(500).send({ status: false, msg: error.message })
  }
}


const getBlog = async function (req, res) {
  try {
    if (Object.keys(req.query).length == 0) {
      let result = await BlogModel.find({ isDeleted: false, isPublished: true })
      if (result.length != 0)
        return res.status(200).send({status:true, data: result})
      if (result.length == 0)
        return res.status(400).send({ status: false, msg: "No blog found" })
    }

    let blogKeys = ["title", "auhtorId", "tags", "category", "subCategory"]
    for (let i = 0; i < Object.keys(req.query).length; i++) {
      let keyPresent = blogKeys.includes(Object.keys(req.query)[i])
      if (!keyPresent)
        return res.status(400).send({ status: false, msg: "Wrong Key present" })
    }

    let filterDetails = req.query;
    filterDetails.isDeleted = false;
    filterDetails.isPublished = true;

    let result = await BlogModel.find(filterDetails)
    if (result.length != 0)
      return res.status(200).send({status : true, data: result});

    if (result.length == 0)
      return res.status(404).send({ status: false, msg: " No blog data found" })
  } catch (error) {
    return res.status(500).send({ status: false, msg: error.message })
  }
}




let updateBlog = async function (req, res) {
  try {
    let blog_id = req.params.blogId;
    if (!blog_id)
      return res.status(400).send({ status: false, msg: "Please enter blog Id" })

    if (Object.keys(req.body).length == 0)
      return res.status(400).send({ status: false, msg: "Please enter data to update" })

    let blogKeys = ["title", "body", "auhtorId", "tags", "category", "subCategory"]
    for (let i = 0; i < Object.keys(req.body).length; i++) {
      let keyPresent = blogKeys.includes(Object.keys(req.body)[i])
      if (!keyPresent)
        return res.status(400).send({ status: false, msg: "Wrong Key present" })
    }
    let updatedBlog = await BlogModel.findOneAndUpdate(
      { _id: blog_id, isDeleted: false },
      { $set: { title: req.body.title, body: req.body.body, category: req.body.category, isPublished: true }, $addToSet: { tags: req.body.tags, subCategory: req.body.subCategory }, $currentDate: { publishedAt: true } },
      { new: true });
    if (!updatedBlog)
      res.status(404).send({ status: false, msg: "No blog data" })
    res.status(200).send({ status: true, data: updatedBlog });
  } catch (error) {
    res.status(500).send({ status: false, msg: error.message })
  }
}


let deleteBlog = async function (req, res) {
  try {
    let blog_id = req.params.blogId;
    if (!blog_id)
      return res.status(400).send({ status: false, msg: "Please enter blog Id" })

    let validBlog = await BlogModel.findOneAndUpdate(
      { _id: blog_id, isDeleted: false },
      { $set: { isDeleted: true }, $currentDate: { deletedAt: true } }
    )
    if (!validBlog)
      return res.status(404).send({ status: false, msg: "Blog data not found" });

    return res.status(200).send()
  } catch (error) {
    return res.status(500).send({ status: false, msg: error.message })
  }
}



const deleteWithQuery = async function (req, res) {
  try {
    if (Object.keys(req.query).length == 0)
      return res.status(400).send({ status: false, msg: "Please enter a filter condition!" })

    let blogKeys = ["auhtorId", "tags", "category", "subCategory"]
    for (let i = 0; i < Object.keys(req.query).length; i++) {
      let keyPresent = blogKeys.includes(Object.keys(req.query)[i])
      if (!keyPresent)
        return res.status(400).send({ status: false, msg: "Wrong Key present" })
    }
    let filterDetails = req.query
    let token = req.headers["x-api-key"]
    let decodedToken = jwt.verify(token, "room 37");
    let authorLoggedIn = decodedToken.authorId
    filterDetails.authorId = authorLoggedIn
    filterDetails.isPublished = false
    filterDetails.isDeleted = false
    
    let result = await BlogModel.updateMany(filterDetails, { isDeleted: true, deletedAt: new Date() })

    if (result.matchedCount == 0)
      return res.status(404).send({ status: false, msg: "No blog to delete" })

    return res.status(200).send({ status: true, data: result })
  } catch (error) {
    return res.status(500).send({ status: false, msg: error.message })
  }
}



module.exports.createBlog = createBlog
module.exports.updateBlog = updateBlog
module.exports.deleteBlog = deleteBlog
module.exports.getBlogs = getBlog
module.exports.deleteWithQuery = deleteWithQuery
module.exports.loginUser = loginUser;







