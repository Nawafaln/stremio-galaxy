#pragma once
#include <windows.h>
#include <filesystem>
#include <system_error>
#include <cstdint>
// Only the exact app-configured stremio-cache directory is accepted; never traverse reparse points.
namespace GalaxyCacheFiles {
inline bool Resolve(const std::filesystem::path& proposed,std::filesystem::path& root){
 std::error_code ec;if(proposed.filename()!=L"stremio-cache")return false;
 auto parent=std::filesystem::weakly_canonical(proposed.parent_path(),ec);if(ec)return false;root=parent/L"stremio-cache";
 const auto attr=GetFileAttributesW(root.c_str());if(attr!=INVALID_FILE_ATTRIBUTES&&(attr&FILE_ATTRIBUTE_REPARSE_POINT))return false;
 const auto actual=std::filesystem::weakly_canonical(root,ec);return !ec&&actual==root;
}
inline bool Size(const std::filesystem::path& proposed,std::uintmax_t& bytes){
 std::filesystem::path root;if(!Resolve(proposed,root))return false;bytes=0;std::error_code ec;if(!std::filesystem::exists(root,ec))return !ec;
 auto it=std::filesystem::recursive_directory_iterator(root,std::filesystem::directory_options::none,ec),end=std::filesystem::recursive_directory_iterator();
 while(!ec&&it!=end){auto attr=GetFileAttributesW(it->path().c_str());if(attr==INVALID_FILE_ATTRIBUTES)return false;if(attr&FILE_ATTRIBUTE_REPARSE_POINT){it.disable_recursion_pending();}else if(!(attr&FILE_ATTRIBUTE_DIRECTORY)){auto n=it->file_size(ec);if(ec)return false;bytes+=n;}it.increment(ec);}return !ec;
}
inline bool RemoveEntry(const std::filesystem::path& path,const std::filesystem::path& root){
 const auto relative=path.lexically_relative(root);if(relative.empty()||relative.is_absolute()||*relative.begin()==L"..")return false;
 const auto attr=GetFileAttributesW(path.c_str());if(attr==INVALID_FILE_ATTRIBUTES)return false;
 if(attr&FILE_ATTRIBUTE_REPARSE_POINT)return (attr&FILE_ATTRIBUTE_DIRECTORY?RemoveDirectoryW(path.c_str()):DeleteFileW(path.c_str()))!=0;
 if(!(attr&FILE_ATTRIBUTE_DIRECTORY))return DeleteFileW(path.c_str())!=0;
 bool ok=true;std::error_code ec;for(auto it=std::filesystem::directory_iterator(path,ec);!ec&&it!=std::filesystem::directory_iterator();it.increment(ec))if(!RemoveEntry(it->path(),root))ok=false;
 return !ec&&RemoveDirectoryW(path.c_str())!=0&&ok;
}
inline bool Clear(const std::filesystem::path& proposed){
 std::filesystem::path root;if(!Resolve(proposed,root))return false;std::error_code ec;if(!std::filesystem::exists(root,ec))return !ec;bool ok=true;
 for(auto it=std::filesystem::directory_iterator(root,ec);!ec&&it!=std::filesystem::directory_iterator();it.increment(ec))if(!RemoveEntry(it->path(),root))ok=false;return !ec&&ok;
}
}
