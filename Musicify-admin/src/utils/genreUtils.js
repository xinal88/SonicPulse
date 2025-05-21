/**
 * Normalizes a genre name by converting to lowercase and removing all non-alphanumeric characters
 * @param {string} name - The genre name to normalize
 * @returns {string} - The normalized genre name
 */
export const normalizeGenreName = (name) => {
  if (!name) return '';
  // Convert to lowercase and remove all non-alphanumeric characters
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
};

/**
 * Checks if a genre name already exists in the provided lists
 * @param {string} newGenreName - The new genre name to check
 * @param {Array} existingGenres - Array of existing genre objects from the database
 * @param {Array} newGenres - Array of new genre names being added
 * @returns {Object} - Object with isDuplicate flag and the duplicate genre name if found
 */
export const isDuplicateGenre = (newGenreName, existingGenres, newGenres) => {
  if (!newGenreName) return { isDuplicate: false };
  
  const normalizedNewName = normalizeGenreName(newGenreName);
  
  // Check against existing genres from database
  const existingDuplicate = existingGenres.find(genre => 
    normalizeGenreName(genre.name) === normalizedNewName
  );
  
  if (existingDuplicate) {
    return { 
      isDuplicate: true, 
      duplicateName: existingDuplicate.name,
      isExisting: true
    };
  }
  
  // Check against new genres being added
  const newDuplicate = newGenres.find(genreName => 
    normalizeGenreName(genreName) === normalizedNewName
  );
  
  if (newDuplicate) {
    return { 
      isDuplicate: true, 
      duplicateName: newDuplicate,
      isExisting: false
    };
  }
  
  return { isDuplicate: false };
};
