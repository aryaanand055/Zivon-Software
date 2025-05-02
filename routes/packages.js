// routes/packageRoutes.js
const express = require('express');
const router = express.Router();
const Package = require('../models/Packages');
const Subscription = require('../models/Subscription');
const verifyToken = require('../middleware/auth');
const Client = require('../models/Client'); // Ensure the Client model is imported

router.get('/', verifyToken, async (req, res) => {
    const packages = await Package.find();
    res.render("../views/pages/packages/allpackages", { title: "All Packages", packages: packages })
});

router.get("/create", verifyToken, (req, res) => {
    res.render("../views/pages/packages/createpackage", { title: "Create Packages" })
})

router.post('/create', verifyToken, async (req, res) => {
    const { name, description, duration, amount } = req.body;
    try {
        const parsedDuration = parseInt(duration);
        const parsedAmount = parseFloat(amount);

        const newPackage = new Package({
            name,
            description,
            duration: parsedDuration,
            amount: parsedAmount,
        });
        await newPackage.save();
        res.redirect("/packages/")
        // res.status(201).json(newPackage);
    } catch (err) {
        console.error("Error while creating package:", err);  // <--- This logs the real issue
        res.status(500).json({ error: 'Failed to create package' });

    }
});

router.get('/edit/:id', verifyToken, async (req, res) => {
    const packageId = req.params.id;
    try {
        const packageToEdit = await Package.findById(packageId);
        if (!packageToEdit) {
            return res.status(404).send("Package not found");
        }
        res.render("../views/pages/packages/editpackage", { title: "Edit Package", pkg: packageToEdit });
    } catch (err) {
        console.error("Error while fetching package for edit:", err);
        res.status(500).send("Error fetching package for edit");
    }
});

router.post('/edit/:id', verifyToken, async (req, res) => {
    const packageId = req.params.id;
    const { name, description, duration, amount } = req.body;

    try {
        const parsedDuration = parseInt(duration);
        const parsedAmount = parseFloat(amount);

        const updatedPackage = await Package.findByIdAndUpdate(packageId, {
            name,
            description,
            duration: parsedDuration,
            amount: parsedAmount,
        }, { new: true });

        if (!updatedPackage) {
            return res.status(404).send("Package not found");
        }
        req.flash("message", "Package updated successfully");
        res.redirect("/packages/")
    } catch (err) {
        console.error("Error while updating package:", err);
        res.status(500).send("Error updating package");
    }
}
);

router.get('/view/:id', verifyToken, async (req, res) => {
    const packageId = req.params.id;
    try {
        const packageToView = await Package.findById(packageId);
        if (!packageToView) {
            return res.status(404).send("Package not found");
        }

        const clients = await Subscription.find({ packageId: packageId }).populate("clientId");
        res.render("../views/pages/packages/viewpackage", { title: "View Package", package: packageToView, clients });
    } catch (err) {
        console.error("Error while fetching package for view:", err);
        res.status(500).send("Error fetching package for view");
    }
});

router.delete('/delete/:id', verifyToken, async (req, res) => {
    const packageId = req.params.id;
    try {
        // Check if the package has any subscriptions associated with it
        const packageWithSubscriptions = await Subscription.findOne({ packageId: packageId });
        if (packageWithSubscriptions) {
            console.warn(`Cannot delete package ${packageId}: associated subscriptions exist.`);
            return res.status(400).json({ error: "Cannot delete package with existing subscriptions" });
        }

        const deletedPackage = await Package.findByIdAndDelete(packageId);
        if (!deletedPackage) {
            console.warn(`Package ${packageId} not found.`);
            return res.status(404).json({ error: "Package not found" });
        }

        console.log(`Package ${packageId} deleted successfully.`);
        res.json({ message: "Package deleted successfully" });
    } catch (err) {
        console.error(`Error while deleting package ${packageId}:`, err);
        res.status(500).json({ error: "An error occurred while deleting the package" });
    }
});

module.exports = router;
