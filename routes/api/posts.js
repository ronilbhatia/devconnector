const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

// Post model
const Post = require("../../models/Post");
// Profile model
const Profile = require("../../models/Profile");

// Validation
const validatePostInput = require("../../validation/post");
const validateCommentInput = require("../../validation/comment");

// @route  GET /api/posts/test
// @desc   Test posts route
// @access Public
router.get("/test", (req, res) => {
  res.json({ msg: "Posts works" });
});

// @route  POST /api/posts
// @desc   Create post
// @access Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      text: req.body.text,
      name: req.user.name,
      avatar: req.user.avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route  GET /api/posts
// @desc   Get posts
// @access Public
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ noPostsFound: "No posts found" }));
});

// @route  GET /api/posts/:id
// @desc   Get post by id
// @access Public
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err =>
      res.status(404).json({ noPostFound: "No post found with that id" })
    );
});

// @route  DELETE /api/posts/:id
// @desc   Delete post
// @access Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notAuthorized: "User not authorized" });
          }

          // Delete
          post.remove().then(() => res.json({ success: true }));
        })
        .catch(err => res.status(404).json({ postNotFound: "No post found" }));
    });
  }
);

// @route  POST /api/posts/:id/likes
// @desc   Like a post
// @access Private
router.post(
  "/:id/likes",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          if (post.likes.find(like => like.user.toString() === req.user.id)) {
            return res
              .status(400)
              .json({ alreadyLiked: "User already liked this post" });
          }

          // Add user id to likes array
          post.likes.unshift({ user: req.user.id });

          // Save
          post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ postNotFound: "No post found" }));
    });
  }
);

// @route  DELETE /api/posts/:id/likes
// @desc   Unlike a post
// @access Private
router.delete(
  "/:id/likes",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          if (!post.likes.find(like => like.user.toString() === req.user.id)) {
            return res
              .status(400)
              .json({ notLiked: "You have not yet liked this post" });
          }

          // Get remove index
          const removeIndex = post.likes
            .map(like => like.user.toString())
            .indexOf(req.user.id);

          // Splice out of array
          post.likes.splice(removeIndex, 1);

          // Save
          post.save().then(pos => res.json(post));
        })
        .catch(() => res.status(404).json({ postNotFound: "No post found" }));
    });
  }
);

// @route  POST /api/posts/:id/comments
// @desc   Create comment on post
// @access Private
router.post(
  "/:id/comments",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { isValid, errors } = validateCommentInput(req.body);

    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          user: req.user.id,
          text: req.body.text,
          name: req.user.name,
          avatar: req.user.avatar
        };

        // Add to comments array
        post.comments.unshift(newComment);

        // Save
        post.save().then(post => res.json(post));
      })
      .catch(() => res.status(404).json({ postNotFound: "No post found" }));
  }
);

// @route  DELETE /api/posts/:id/comments/:comment_id
// @desc   Remove comment on post
// @access Private
router.delete(
  "/:id/comments/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        // Check to see if comment exists
        if (
          !post.comments.find(
            comment => comment._id.toString() === req.params.comment_id
          )
        ) {
          return res
            .status(404)
            .json({ commentDoesntExist: "Comment does not exist" });
        }
        // Get remove index
        const removeIndex = post.comments
          .map(comment => comment._id.toString())
          .indexOf(req.params.comment_id);

        // Splice out of array
        post.comments.splice(removeIndex, 1);

        // Save
        post.save().then(post => res.json(post));
      })
      .catch(() => res.status(404).json({ postNotFound: "No post found" }));
  }
);

module.exports = router;
