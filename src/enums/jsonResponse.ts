export enum JsonResponse {
    // 2xx Success
    OK = 200, // Solicitud exitosa
    CREATED = 201, // Recurso creado
    ACCEPTED = 202, // Solicitud aceptada para procesamiento
    NO_CONTENT = 204, // Sin contenido para retornar

    // 3xx Redirection
    MOVED_PERMANENTLY = 301, // Recurso movido permanentemente
    FOUND = 302, // Recurso encontrado en otra ubicación temporalmente
    SEE_OTHER = 303, // Ver otro recurso
    NOT_MODIFIED = 304, // No modificado
    TEMPORARY_REDIRECT = 307, // Redirección temporal

    // 4xx Client Error
    BAD_REQUEST = 400, // Solicitud mal formada
    UNAUTHORIZED = 401, // No autorizado
    FORBIDDEN = 403, // Prohibido
    NOT_FOUND = 404, // No encontrado
    METHOD_NOT_ALLOWED = 405, // Método no permitido
    NOT_ACCEPTABLE = 406, // No aceptable
    CONFLICT = 409, // Conflicto
    UNPROCESSABLE_ENTITY = 422, // Entidad no procesable
    TOO_MANY_REQUESTS = 429, // Demasiadas solicitudes

    // 5xx Server Error
    INTERNAL_SERVER_ERROR = 500, // Error interno del servidor
    NOT_IMPLEMENTED = 501 // No implementado
}
