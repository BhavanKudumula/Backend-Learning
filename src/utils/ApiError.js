class ApiError extends Error {
    constructor (
        statusCode,
        message="Something Went Wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null // need to read the document.
        this.message = message
        this.success = false
        this.errors = errors
        
        //The below stack trace will be used for development purpose to find the trace of the error. When moving to production we will remove this code
        if(stack) { 
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export {ApiError};