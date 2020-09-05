class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const { page, limit, sort, fields, ...queryObj } = this.queryString;
    console.log(
      `page: ${page}\n`,
      `limit: ${limit}\n`,
      `sort: ${sort}\n`,
      `fields: ${fields}\n`,
      `queryObj: ${JSON.stringify(queryObj)}\n`
    );

    //1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(lt|gt|lte|gte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    const { sort } = this.queryString;
    if (sort) {
      const sortBy = sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  fieldLimiting() {
    const { fields } = this.queryString;
    if (fields) {
      const selectedFields = fields.split(',').join(' ');
      this.query = this.query.select(selectedFields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const { page, limit } = this.queryString;
    const pageNum = page * 1 || 1;
    const limitPerPage = limit * 1 || 100;
    const skip = (pageNum - 1) * limitPerPage;

    this.query = this.query.skip(skip).limit(limitPerPage);
    return this;
  }
}

module.exports = APIFeatures;
