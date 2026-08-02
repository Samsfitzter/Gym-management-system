import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Calendar, User, Tag, Plus, X, Maximize2 } from 'lucide-react';
import ptApi from '../api/pt.api';

export default function ImageGallery({ clientId, userRole }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [imageType, setImageType] = useState('before');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);
  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const fetchProgressImages = async () => {
    try {
      setLoading(true);
      const res = await ptApi.getProgressImages(clientId);
      if (res.success) {
        setImages(res.data);
      }
    } catch (err) {
      console.error('Error fetching progress images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchProgressImages();
    }
  }, [clientId]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    if (!selectedFile) {
      setError('Please select an image file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('image_type', imageType);
    formData.append('caption', caption);

    try {
      setUploading(true);
      setError('');
      setSuccess('');
      const res = await ptApi.uploadProgressImage(clientId, formData);
      if (res.success) {
        setSuccess('Progress photo uploaded successfully.');
        setCaption('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUploadForm(false);
        await fetchProgressImages();
      }
    } catch (err) {
      console.error('Error uploading progress photo:', err);
      setError(err.response?.data?.message || 'Failed to upload progress photo.');
    } finally {
      setUploading(false);
    }
  };

  const getPTImageUrl = (url) => {
    if (!url) return '';
    // If url is absolute, return it, otherwise append backend URL
    if (url.startsWith('http')) return url;
    return `http://localhost:5000${url}`;
  };

  const beforeImages = images.filter(img => img.image_type === 'before');
  const afterImages = images.filter(img => img.image_type === 'after');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={14} />
          <span>Transformation Progress Gallery</span>
        </h4>
        
        {canEdit && !showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} />
            <span>Upload Photo</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Upload Photo Form Card */}
      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="bg-slate-950/20 p-4 border border-slate-850 rounded-2xl space-y-3">
          <div className="flex justify-between items-center pb-1 border-b border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upload New Progress Photo</span>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setCaption('');
              }}
              className="text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Timeline Phase *</label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="before">Before Phase</option>
                <option value="after">After Phase</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Select File *</label>
              <input
                type="file"
                ref={fileInputRef}
                required
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1 text-xs text-slate-400 focus:outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">Caption / Label (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Front Pose - Week 4 Progress"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={13} />
              <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      ) : images.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-xs italic">
          No transformation photos uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Before Photos */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 w-fit">
              Before Views
            </span>
            {beforeImages.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-2">No before photos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {beforeImages.map((img) => (
                  <div key={img.id} className="relative group overflow-hidden rounded-xl border border-slate-850 bg-slate-950/40 aspect-square">
                    <img
                      src={getPTImageUrl(img.image_url)}
                      alt={img.caption || 'Before'}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-[9px]">
                      <button
                        onClick={() => setLightboxImage(img)}
                        className="p-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 self-end hover:text-white"
                      >
                        <Maximize2 size={10} />
                      </button>
                      <div>
                        {img.caption && <strong className="text-white block truncate mb-0.5">{img.caption}</strong>}
                        <span className="text-slate-400 block truncate">By {img.uploader_name || 'Staff'}</span>
                        <span className="text-slate-500 block truncate">{new Date(img.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Photos */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">
              After Views
            </span>
            {afterImages.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-2">No after photos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {afterImages.map((img) => (
                  <div key={img.id} className="relative group overflow-hidden rounded-xl border border-slate-850 bg-slate-950/40 aspect-square">
                    <img
                      src={getPTImageUrl(img.image_url)}
                      alt={img.caption || 'After'}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-[9px]">
                      <button
                        onClick={() => setLightboxImage(img)}
                        className="p-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 self-end hover:text-white"
                      >
                        <Maximize2 size={10} />
                      </button>
                      <div>
                        {img.caption && <strong className="text-white block truncate mb-0.5">{img.caption}</strong>}
                        <span className="text-slate-400 block truncate">By {img.uploader_name || 'Staff'}</span>
                        <span className="text-slate-500 block truncate">{new Date(img.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
          
          <div 
            className="max-w-2xl w-full flex flex-col items-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getPTImageUrl(lightboxImage.image_url)}
              alt={lightboxImage.caption || 'Progress Photo'}
              className="max-h-[75vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
            <div className="text-center text-xs text-slate-300 bg-slate-900/60 py-3 px-6 rounded-2xl border border-slate-800/40 w-fit backdrop-blur-md">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                {lightboxImage.image_type} Phase Photo
              </span>
              {lightboxImage.caption && <p className="font-extrabold text-sm text-white mb-0.5">{lightboxImage.caption}</p>}
              <p className="text-slate-400">
                Uploaded by {lightboxImage.uploader_name || 'Staff'} on{' '}
                {new Date(lightboxImage.uploaded_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
