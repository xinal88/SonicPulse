# Clone the Musicify repository (replace with actual URL if different)
git clone https://github.com/your-username/Musicify.git

# Navigate to the cloned directory
cd Musicify

# Remove the existing remote origin
git remote remove origin

# Add the new SonicPulse repository as the remote
git remote add origin https://github.com/your-username/SonicPulse.git

# Push all branches and tags to the new repository
git push -u origin --all
git push -u origin --tags