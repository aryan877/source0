import { DocumentTextIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Card, CardBody } from "@heroui/react";

interface FileAttachmentProps {
  files: File[];
  onRemove: (index: number) => void;
}

export const FileAttachment = ({ files, onRemove }: FileAttachmentProps) => {
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <PhotoIcon className="text-primary h-5 w-5" />;
    }
    return <DocumentTextIcon className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((file, index) => (
        <Card key={index} className="max-w-[300px]">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-content2 flex-shrink-0 rounded-lg p-2">{getFileIcon(file)}</div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="max-w-[200px] truncate text-sm font-semibold">{file.name}</span>
                <span className="text-default-500 text-xs">{formatFileSize(file.size)}</span>
              </div>
              <Button
                variant="light"
                isIconOnly
                color="danger"
                size="sm"
                onPress={() => onRemove(index)}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};
