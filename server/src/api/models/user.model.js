const mongoose = require('mongoose')
const {env, jwtExpirationInterval, jwtSecret} = require('../../config/vars')
const userRoles = ['user', 'admin'];
const bcrypt = require('bcrypt');
const moment = require('moment');
const jwt = require("jwt-simple");
const httpStatus = require('http-status')
const APIError = require('../utils/APIError')
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        maxlength: 48,
        unique: true
    },
    password: {
        type: String
    },
    fullName: {
        type: String,
        maxlength: 50
    },
    avatar: String,
    role: {
        type: String, default: 'user'
    }
}, {timestamps: true})


userSchema.pre('save', async function save(next){
    try{
        if (!this.isModified("password")) {
            return next();
        }
        const rounds = env !== 'production' ? 1 : 10 
        const hash = await bcrypt.hash(this.password, rounds);
        this.password = hash;
        return next();
    }catch(error){
        next(error)
    }
})

/**
 * Method
 */
userSchema.method({
    transoform() {
        let transoformed = {};
        const fields = ["id", "fullName", "email", "createdAt"];

        fields.forEach(field => {
            transoformed[field] = this[field];
        });
        return transoformed;
    },
    token() {
        const payload = {
            exp: moment()
                .add(jwtExpirationInterval, "minutes")
                .unix(),
            iat: moment().unix(),
            sub: this._id
        };
        return jwt.encode(payload, jwtSecret);
    },
    passwordMatches(password){
        return bcrypt.compare(password, this.password)
    }
});

userSchema.statics = {
    /**
     * 
     * @param {} options 
     */
    async findAndGenerateToken(options) {
        const { email, password } = options;

        const user = await this.findOne({ email }).exec();

        const err = {
            status: httpStatus.BAD_REQUEST,
            isPublic: true
        };
        console.log(this.email);
        if (!user) {
            err.message = "This account does not exists";
        } else if (password) {
            if (user && user.passwordMatches(password)) {
                return {
                    user,
                    accessToken: user.token()
                };
            }
            err.message = "Inconnect email or password";
        }
        throw new APIError(err);
    }
};


module.exports = new mongoose.model("User", userSchema);
