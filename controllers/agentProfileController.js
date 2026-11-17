
const {
  getAgentProfile,
  saveAgentProfile,
  saveAgentDocument,
} = require("../models/agentProfileModel");

const getMyAgentProfile = async (req, res) => {
  try {
    const profile = await getAgentProfile(req.user.id);

    if (!profile) {
      return res.status(200).json({
        success: true,
        profile: null,
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get Agent Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent profile",
    });
  }
};

const updateMyAgentProfile = async (req, res) => {
  try {
    const { address, experience_years, skills, service_area } = req.body;

    if (
      typeof address !== "string" ||
      !address.trim() ||
      typeof skills !== "string" ||
      !skills.trim() ||
      typeof service_area !== "string" ||
      !service_area.trim() ||
      experience_years === "" ||
      experience_years === undefined ||
      !Number.isInteger(Number(experience_years)) ||
      Number(experience_years) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid address, experience, skills and service area are required",
      });
    }

    const profile = await saveAgentProfile(
      req.user.id,
      address.trim(),
      Number(experience_years),
      skills.trim(),
      service_area.trim()
    );

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Only agent accounts can update this profile",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agent profile saved successfully",
      profile,
    });
  } catch (error) {
    console.error("Update Agent Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save agent profile",
    });
  }
};


const uploadMyAgentDocument = async (req, res) => {
  let savedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid document.",
      });
    }

    const path = require("path");
    savedFilePath = req.file.path;

    const relativePath = path.relative(
      path.join(process.cwd(), "private_uploads"),
      req.file.path
    );

    const document = await saveAgentDocument(
      req.user.id,
      relativePath,
      req.file.originalname,
      req.file.mimetype
    );

    if (!document) {
      const fs = require("fs");
      fs.unlinkSync(savedFilePath);

      return res.status(403).json({
        success: false,
        message: "Only agent accounts can upload documents.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully. Verification is pending.",
      document,
    });
  } catch (error) {
    console.error("Agent Document Upload Error:", error);

    if (savedFilePath) {
      const fs = require("fs");

      try {
        if (fs.existsSync(savedFilePath)) {
          fs.unlinkSync(savedFilePath);
        }
      } catch (cleanupError) {
        console.error("Uploaded file cleanup failed:", cleanupError);
      }
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid agent account.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to upload document.",
    });
  }
};


module.exports = {
  getMyAgentProfile,
  updateMyAgentProfile,
  uploadMyAgentDocument,
};
