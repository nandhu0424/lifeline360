/**
 * districtFilter middleware — automatically injects the logged-in DDHS officer's
 * district into req.districtFilter so controllers always query district-scoped data.
 */
const districtFilter = (req, res, next) => {
  if (!req.user || !req.user.district) {
    return res.status(403).json({ success: false, message: 'District information missing from token.' });
  }
  req.districtFilter = { district: req.user.district };
  next();
};

module.exports = { districtFilter };
