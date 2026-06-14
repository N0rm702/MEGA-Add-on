import { File } from 'megajs';

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    let file;
    try {
      file = File.fromURL(url);
    } catch (e) {
      return Response.json({ error: 'Invalid MEGA URL format. Make sure it starts with https://mega.nz/' }, { status: 400 });
    }

    try {
      await file.loadAttributes();
    } catch (attrError) {
      console.error('Error loading attributes:', attrError);
      return Response.json({ 
        error: 'Failed to access the MEGA link. Please check if the link is correct, public, and contains the decryption key (the part after the # symbol).' 
      }, { status: 400 });
    }

    const parseNode = (node) => {
      const item = {
        name: node.name || 'Unnamed file',
        directory: !!node.directory,
        size: node.size || 0,
        id: node.downloadId || node.nodeId || `${node.name}-${node.size || 0}-${Math.random().toString(36).slice(2, 7)}`,
      };
      
      if (node.directory && node.children) {
        // Sort directories first, then files alphabetically
        item.children = node.children
          .map(parseNode)
          .sort((a, b) => {
            if (a.directory && !b.directory) return -1;
            if (!a.directory && b.directory) return 1;
            return a.name.localeCompare(b.name);
          });
      }
      return item;
    };

    if (file.directory) {
      const children = file.children || [];
      const structure = children
        .map(parseNode)
        .sort((a, b) => {
          if (a.directory && !b.directory) return -1;
          if (!a.directory && b.directory) return 1;
          return a.name.localeCompare(b.name);
        });

      return Response.json({
        name: file.name || 'MEGA Folder',
        directory: true,
        children: structure,
      });
    } else {
      return Response.json({
        name: file.name || 'MEGA File',
        directory: false,
        size: file.size || 0,
        id: file.downloadId || `${file.name}-${file.size || 0}`,
      });
    }
  } catch (error) {
    console.error('MEGA API General Error:', error);
    let message = 'Failed to fetch MEGA metadata. Please make sure the link is correct and public.';
    if (error.message && (error.message.includes('ENOENT') || error.message.includes('not found'))) {
      message = 'MEGA folder or file not found. It may have been deleted, or the decryption key is incorrect.';
    } else if (error.message) {
      message = error.message;
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
